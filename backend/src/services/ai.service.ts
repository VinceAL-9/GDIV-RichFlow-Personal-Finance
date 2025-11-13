import { getIncomeLines } from './income.service';
import { getExpenses } from './expense.service';
import { getCashSavings } from './cashSavings.service';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = process.env.GEMINI_MODEL;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment');
}
if (!GEMINI_MODEL) {
  throw new Error('GEMINI_MODEL is not set in environment');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// collecting user financial status
export async function collectUserFinancialStatus(userId: number) {
    const [incomes, expenses, cashSavings] = await Promise.all([
        getIncomeLines(userId),
        getExpenses(userId),
        getCashSavings(userId),
    ]);

    return { incomes, expenses, cashSavings };
}

export async function analyzeFinance(userId: number) {
    const { incomes, expenses, cashSavings } = await collectUserFinancialStatus(userId);

    // ai analysis
    const response = await ai.models.generateContent({
        model: GEMINI_MODEL!,
        contents: `You are a financial adivsor. Given this user data, return only valid json with keys:
        - Income analysis: insights on earned, passive, and portfolio income trends, ratios and more
        - Expense behavior: notable increases, recurring high-cost categories, spending balance and more
        - Cashflow and savings: sustainability of current savings rate, spending-to-income ratio and more
        - Assets and liabilities: asset growth, debt-to-asset ratio, liquidity and more
        - Financial Freedom Progress: percentage of expenses covered by passive/portfolio income, suggestions to improve the ratio and more

        User Data:
        Incomes: ${JSON.stringify(incomes)}
        Expenses: ${JSON.stringify(expenses)}
        Cash Savings: ${JSON.stringify(cashSavings)}
        `,
        config: {
            systemInstruction: " return in this format, at most 3 sentences per category and just put the main takeaways { 'Income analysis': '', 'Expense behavior': '', 'Cashflow and savings': '', 'Assets and liabilities': '', 'Financial Freedom Progress': '' }",
        }
    });

    // Robust extraction of generated text
    try {
        const anyResp: any = response;
        let textOutput = '';

        // common candidate-based shape
        const candidate = anyResp?.candidates?.[0];

        if (candidate) {
            const content = candidate.content;
            if (content?.parts && Array.isArray(content.parts)) {
                textOutput = content.parts.map((p: any) => {
                    if (typeof p === 'string') return p;
                    return p?.text ?? JSON.stringify(p);
                }).join('');
            } else if (typeof content === 'string') {
                textOutput = content;
            } else if (content?.text) {
                textOutput = content.text;
            } else {
                textOutput = JSON.stringify(content);
            }
        } else if (anyResp?.outputText && typeof anyResp.outputText === 'string') {
            textOutput = anyResp.outputText;
        } else if (typeof anyResp === 'string') {
            textOutput = anyResp;
        } else {
            textOutput = JSON.stringify(anyResp);
        }

        // Remove surrounding markdown/code fences like ```json ... ```
        textOutput = textOutput
            .replace(/^\s*```(?:\w+)?\s*/i, '')   // leading ``` or ```json
            .replace(/\s*```\s*$/i, '')           // trailing ```
            .trim();

        return textOutput;
    } catch (err) {
        // return full response as fallback for debugging
        return JSON.stringify(response);
    }
}