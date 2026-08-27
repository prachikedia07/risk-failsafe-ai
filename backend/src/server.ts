import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req,res) =>{
    res.json({
        message : "RiskFailsafe AI backend is running!"
    });
});
const PORT = process.env.PORT || 5002;
app.listen(PORT, ()=>{
     console.log(`Server running on http://localhost:${PORT}`);
})