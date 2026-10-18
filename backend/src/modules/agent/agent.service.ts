import { Type, FunctionDeclaration } from "@google/genai";

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

export const investigateRisk = async (
    riskAnalysisId: string
): Promise<AgentDecision> => {
    const analysis =
        await getRiskSignals(
            riskAnalysisId
        );

    const merchantId =
        await getMerchantId(
            riskAnalysisId
        );

    const initialPrompt = `
Investigate this RiskFailsafe risk analysis.

Risk analysis ID:
${riskAnalysisId}

Merchant ID:
${merchantId}

Initial detector evidence:
${JSON.stringify(
    analysis,
    null,
    2
)}

Investigate the situation using the available tools when useful.
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

    for (;;) {
        const response =
            await gemini.models.generateContent(
                {
                    model: "gemini-3.6-flash",
                    contents,

                    config: {
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
                    },
                }
            );

                const functionCalls =
            response.functionCalls ?? [];

        /*
         * Gemini has finished investigating and
         * returned the final decision.
         */
        if (functionCalls.length === 0) {
            if (!response.text) {
                throw new Error(
                    "Gemini returned an empty response"
                );
            }

            const decision =
                JSON.parse(
                    response.text
                ) as AgentDecision;

            const validatedDecision =
                validateAgentDecision(
                    decision
                );

            await createRiskAlert({
                merchantId,
                riskAnalysisId,
                riskScore:
                    analysis.riskScore,
                riskLevel:
                    analysis.riskLevel as
                        | "LOW"
                        | "MEDIUM"
                        | "HIGH"
                        | "CRITICAL",
                title:
                    "Suspicious transaction activity detected",
                message:
                    validatedDecision.summary,
                action:
                    validatedDecision.action,
                confidence:
                    validatedDecision.confidence,
                reasons: validatedDecision.reasons,
            });

            return validatedDecision;
        }

        /*
         * Gemini wants to use one or more tools.
         */
        toolCallCount +=
            functionCalls.length;

        if (
            toolCallCount >
            MAX_TOOL_CALLS
        ) {
            throw new Error(
                "Agent exceeded maximum tool calls"
            );
        }

        /*
         * Preserve Gemini's previous response
         * before sending the tool results back.
         */
        contents.push(
            response.candidates![0]
                .content as any
        );

        for (
            const functionCall
                of functionCalls
        ) {
            const result =
                await executeTool(
                    functionCall.name!,
                    functionCall.args ?? {}
                );

            contents.push({
                role: "user",
                parts: [
                    {
                        functionResponse: {
                            name:
                                functionCall.name,
                            response: {
                                result,
                            },
                            id:
                                functionCall.id,
                        },
                    },
                ],
            });
        }
    }
}

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