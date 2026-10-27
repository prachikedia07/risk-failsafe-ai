import { Type, FunctionDeclaration } from "@google/genai";
import Groq from "groq-sdk";

import { gemini } from "../../lib/gemini";
import prisma from "../../lib/prisma";

import {
    getRecentTransactions,
    getMerchantBaseline,
    getRiskSignals,
    createRiskAlert,
} from "./agent.tools";

import {
    AgentDecision,
} from "./agent.types";

import {
    AGENT_SYSTEM_INSTRUCTION,
} from "./agent.prompt";

const MAX_TOOL_CALLS = 5;

const toolDeclarations: FunctionDeclaration[] = [
    {
        name: "getRecentTransactions",
        description:
            "Get a bounded list of recent transactions for a merchant.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                merchantId: {
                    type: Type.STRING,
                    description:
                        "Merchant UUID.",
                },

                minutes: {
                    type: Type.NUMBER,
                    description:
                        "How many minutes of recent activity to inspect. Maximum 60.",
                },
            },

            required: [
                "merchantId",
                "minutes",
            ],
        },
    },

    {
        name: "getMerchantBaseline",
        description:
            "Get the merchant baseline evidence used by the current risk analysis.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                riskAnalysisId: {
                    type: Type.STRING,
                    description:
                        "Risk analysis UUID.",
                },
            },

            required: [
                "riskAnalysisId",
            ],
        },
    },

    {
        name: "getRiskSignals",
        description:
            "Get the statistical risk score and evidence for a risk analysis.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                riskAnalysisId: {
                    type: Type.STRING,
                    description:
                        "Risk analysis UUID.",
                },
            },

            required: [
                "riskAnalysisId",
            ],
        },
    },
];

const groqClient = process.env.GROQ_API_KEY
    ? new Groq({
          apiKey: process.env.GROQ_API_KEY,
      })
    : null;

const GROQ_MODEL =
    process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const GEMINI_MODELS = [
    ...new Set([
        process.env.GEMINI_PRIMARY_MODEL ||
            "gemini-3.6-flash",

        process.env.GEMINI_FALLBACK_MODEL ||
            "gemini-3.5-flash-lite",
    ]),
];

let geminiCooldownUntil = 0;

const wait = (ms: number) =>
    new Promise<void>((resolve) =>
        setTimeout(resolve, ms)
    );

function getErrorDetails(error: unknown) {
    const value = error as {
        status?: unknown;
        statusCode?: unknown;
        code?: unknown;
        message?: unknown;
    };

    return {
        status: Number(
            value?.status ??
                value?.statusCode ??
                0
        ),

        code: String(value?.code ?? ""),

        message: String(
            value?.message ?? error
        ),
    };
}

function isQuotaError(error: unknown) {
    const { status, code, message } =
        getErrorDetails(error);

    return (
        status === 429 ||
        /RESOURCE_EXHAUSTED|rate.?limit/i.test(
            `${code} ${message}`
        )
    );
}

function isModelNotFound(error: unknown) {
    const { status, message } =
        getErrorDetails(error);

    return (
        status === 404 ||
        /unknown model|model.*not found/i.test(
            message
        )
    );
}

function isTransientGeminiError(
    error: unknown
) {
    const { status, code, message } =
        getErrorDetails(error);

    return (
        [408, 500, 502, 503, 504].includes(
            status
        ) ||
        /UNAVAILABLE|INTERNAL|overloaded|temporarily unavailable|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
            `${code} ${message}`
        )
    );
}

function isServiceUnavailable(
    error: unknown
) {
    const { status, code, message } =
        getErrorDetails(error);

    return (
        status === 503 ||
        /UNAVAILABLE|overloaded/i.test(
            `${code} ${message}`
        )
    );
}

async function generateGeminiResponse(
    contents: any[],
    config: any
) {
    if (Date.now() < geminiCooldownUntil) {
        throw new Error(
            "Gemini is temporarily in cooldown; trying the alternate provider."
        );
    }

    let lastError: unknown;

    for (const model of GEMINI_MODELS) {
        for (
            let attempt = 0;
            attempt < 2;
            attempt++
        ) {
            try {
                const response =
                    await gemini.models.generateContent({
                        model,
                        contents,
                        config,
                    });

                geminiCooldownUntil = 0;

                console.info(
                    `[LLM] Gemini succeeded: ${model}`
                );

                return {
                    response,
                    model,
                };
            } catch (error) {
                lastError = error;

                // Try the next model for quota or
                // model-availability errors.
                if (
                    isQuotaError(error) ||
                    isModelNotFound(error)
                ) {
                    break;
                }

                // Don't repeatedly retry errors such
                // as invalid credentials or bad input.
                if (
                    !isTransientGeminiError(error)
                ) {
                    throw error;
                }

                // One bounded retry with backoff
                // and a little random jitter.
                if (attempt === 0) {
                    await wait(
                        500 +
                            Math.floor(
                                Math.random() * 300
                            )
                    );

                    continue;
                }

                // Both attempts failed. Try the
                // next configured Gemini model.
                break;
            }
        }
    }

    // Avoid repeatedly hammering Gemini during a
    // short-lived service outage.
    if (isServiceUnavailable(lastError)) {
        geminiCooldownUntil =
            Date.now() + 30_000;
    }

    throw lastError instanceof Error
        ? lastError
        : new Error(
              "All configured Gemini models failed."
          );
}

async function investigateWithGroq(
    analysis: Awaited<
        ReturnType<typeof getRiskSignals>
    >
): Promise<AgentDecision> {
    if (!groqClient) {
        throw new Error(
            "GROQ_API_KEY is not configured."
        );
    }

    const response =
        await groqClient.chat.completions.create({
            model: GROQ_MODEL,
            temperature: 0,

            messages: [
                {
                    role: "system",

                    content:
                        AGENT_SYSTEM_INSTRUCTION +
                        "\n\n" +
                        "You are running as a fallback investigator. " +
                        "You do not have access to database tools in this call. " +
                        "Use only the supplied statistical evidence. " +
                        "Do not invent facts. " +
                        "Prefer REVIEW when evidence is concerning but inconclusive.",
                },

                {
                    role: "user",

                    content:
                        "Investigate this risk evidence and return a decision:\n" +
                        JSON.stringify(
                            analysis,
                            null,
                            2
                        ),
                },
            ],

            response_format: {
                type: "json_schema",

                json_schema: {
                    name: "risk_decision",
                    strict: true,

                    schema: {
                        type: "object",

                        properties: {
                            summary: {
                                type: "string",
                            },

                            reasons: {
                                type: "array",

                                items: {
                                    type: "string",
                                },
                            },

                            action: {
                                type: "string",

                                enum: [
                                    "ALLOW",
                                    "REVIEW",
                                    "PAUSE",
                                ],
                            },

                            confidence: {
                                type: "number",
                            },
                        },

                        required: [
                            "summary",
                            "reasons",
                            "action",
                            "confidence",
                        ],

                        additionalProperties: false,
                    },
                },
            },
        });

    const text =
        response.choices[0]?.message?.content;

    if (!text) {
        throw new Error(
            "Groq returned an empty response."
        );
    }

    const decision =
        JSON.parse(text) as AgentDecision;

    return validateAgentDecision(decision);
}


export const investigateRisk = async (
    riskAnalysisId: string
): Promise<AgentDecision> => {
    const analysis = await getRiskSignals(
        riskAnalysisId
    );

    const merchantId = await getMerchantId(
        riskAnalysisId
    );

    const initialPrompt = `
Investigate this RiskFailsafe risk analysis.

Risk analysis ID:
${riskAnalysisId}

Merchant ID:
${merchantId}

Initial detector evidence:
${JSON.stringify(analysis, null, 2)}

Investigate the situation using available tools when useful.
Do not invent facts.

Return a structured JSON decision with:
{
  "summary": "short explanation",
  "reasons": ["reason 1", "reason 2"],
  "action": "ALLOW | REVIEW | PAUSE",
  "confidence": 0.0
}
`;

    let contents: any[] = [
        {
            role: "user",
            parts: [
                {
                    text:
                        AGENT_SYSTEM_INSTRUCTION +
                        "\n\n" +
                        initialPrompt,
                },
            ],
        },
    ];

    let toolCallCount = 0;

    let decisionToSave: AgentDecision | null =
        null;

    let investigationStatus:
        | "COMPLETED"
        | "UNAVAILABLE" = "COMPLETED";

    let investigationProvider:
        | string
        | null = null;

    /*
     * First try Gemini, including the configured
     * Gemini model fallback and bounded retries.
     */
    try {
        for (;;) {
            const { response, model } =
                await generateGeminiResponse(
                    contents,
                    {
                        tools: [
                            {
                                functionDeclarations:
                                    toolDeclarations,
                            },
                        ],

                        responseMimeType:
                            "application/json",

                        responseSchema: {
                            type: Type.OBJECT,

                            properties: {
                                summary: {
                                    type: Type.STRING,
                                },

                                reasons: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.STRING,
                                    },
                                },

                                action: {
                                    type: Type.STRING,
                                    enum: [
                                        "ALLOW",
                                        "REVIEW",
                                        "PAUSE",
                                    ],
                                },

                                confidence: {
                                    type: Type.NUMBER,
                                },
                            },

                            required: [
                                "summary",
                                "reasons",
                                "action",
                                "confidence",
                            ],
                        },
                    }
                );

            const functionCalls =
                response.functionCalls ?? [];

            /*
             * Gemini has returned its final decision.
             */
            if (functionCalls.length === 0) {
                if (!response.text) {
                    throw new Error(
                        "Gemini returned an empty response"
                    );
                }

                const decision = JSON.parse(
                    response.text
                ) as AgentDecision;

                decisionToSave =
                    validateAgentDecision(decision);

                investigationProvider =
                    `google:${model}`;

                break;
            }

            /*
             * Gemini wants to inspect more evidence
             * through one of our existing tools.
             */
            toolCallCount += functionCalls.length;

            if (toolCallCount > MAX_TOOL_CALLS) {
                throw new Error(
                    "Agent exceeded maximum tool calls"
                );
            }

            const candidateContent =
                response.candidates?.[0]?.content;

            if (!candidateContent) {
                throw new Error(
                    "Gemini returned tool calls without candidate content"
                );
            }

            contents.push(candidateContent as any);

            for (const functionCall of functionCalls) {
                if (!functionCall.name) {
                    throw new Error(
                        "Gemini returned a tool call without a name"
                    );
                }

                const result = await executeTool(
                    functionCall.name,
                    functionCall.args ?? {}
                );

                contents.push({
                    role: "user",
                    parts: [
                        {
                            functionResponse: {
                                name: functionCall.name,
                                response: {
                                    result,
                                },
                                id: functionCall.id,
                            },
                        },
                    ],
                });
            }
        }
    } catch (geminiError) {
        console.error(
            "[LLM] Gemini investigation failed:",
            geminiError instanceof Error
                ? geminiError.message
                : geminiError
        );

        /*
         * Gemini failed. Try the independent Groq
         * provider using the saved risk evidence.
         */
        try {
            decisionToSave =
                await investigateWithGroq(analysis);

            investigationStatus = "COMPLETED";

            investigationProvider =
                `groq:${GROQ_MODEL}`;

            console.info(
                `[LLM] Groq fallback succeeded: ${GROQ_MODEL}`
            );
        } catch (groqError) {
            console.error(
                "[LLM] Groq investigation failed:",
                groqError instanceof Error
                    ? groqError.message
                    : groqError
            );

            /*
             * Neither provider returned a decision.
             * This is a deterministic fallback,
             * not an AI-generated investigation.
             */
            decisionToSave = {
                summary:
                    "Suspicious activity was detected by the statistical risk engine. AI investigation could not be completed. Manual review is required.",

                reasons: [
                    "The statistical risk engine flagged this activity as suspicious.",
                    "Gemini did not return a usable investigation.",
                    "The alternate AI provider also failed. This alert uses a deterministic fallback.",
                ],

                action: "REVIEW",

                // No model confidence is available.
                confidence: 0,
            };

            investigationStatus = "UNAVAILABLE";

            investigationProvider = "static-fallback";
        }
    }

    if (!decisionToSave) {
        throw new Error(
            "No investigation decision was produced"
        );
    }

    /*
     * Save the alert once, after provider selection.
     * Updating the same riskAnalysisId reuses the
     * existing alert through the Prisma upsert.
     *
     * This database write is deliberately outside
     * the provider try/catch blocks.
     */
    await createRiskAlert({
        merchantId,
        riskAnalysisId,

        riskScore: analysis.riskScore,

        riskLevel:
            analysis.riskLevel as
                | "LOW"
                | "MEDIUM"
                | "HIGH"
                | "CRITICAL",

        title:
            "Suspicious transaction activity detected",

        message: decisionToSave.summary,

        action: decisionToSave.action,

        confidence: decisionToSave.confidence,

        reasons: decisionToSave.reasons,

        investigationStatus,

        investigationProvider,
    });

    console.info(
        `[LLM] Alert saved. Provider: ${investigationProvider}; status: ${investigationStatus}`
    );

    return decisionToSave;
};


const getMerchantId = async (
    riskAnalysisId: string
): Promise<string> => {
    const analysis =
        await prisma.riskAnalysis.findUnique(
            {
                where: {
                    id: riskAnalysisId,
                },

                select: {
                    merchantId: true,
                },
            }
        );

    if (!analysis) {
        throw new Error(
            "Risk analysis not found"
        );
    }

    return analysis.merchantId;
};

async function executeTool(
    toolName: string,
    args: Record<string, unknown>
) {
    switch (toolName) {
        case "getRecentTransactions":
            return getRecentTransactions(
                args.merchantId as string,
                args.minutes as number
            );

        case "getMerchantBaseline":
            return getMerchantBaseline(
                args.riskAnalysisId as string
            );

        case "getRiskSignals":
            return getRiskSignals(
                args.riskAnalysisId as string
            );

        default:
            throw new Error(
                `Unknown agent tool: ${toolName}`
            );
    }
}

const validateAgentDecision = (
    decision: AgentDecision
): AgentDecision => {
    if (
        typeof decision.summary !==
        "string"
    ) {
        throw new Error(
            "Invalid agent summary"
        );
    }

    if (
        !Array.isArray(
            decision.reasons
        )
    ) {
        throw new Error(
            "Invalid agent reasons"
        );
    }

    if (
        ![
            "ALLOW",
            "REVIEW",
            "PAUSE",
        ].includes(
            decision.action
        )
    ) {
        throw new Error(
            "Invalid agent action"
        );
    }

    if (
        typeof decision.confidence !==
            "number" ||
        decision.confidence < 0 ||
        decision.confidence > 1
    ) {
        throw new Error(
            "Invalid agent confidence"
        );
    }

    return decision;
};