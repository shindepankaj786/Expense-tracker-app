/**
 * ML-inspired categorization logic.
 * In a real-world scenario, this would use a Bayes classifier or a more complex model.
 * Here we use a weighted keyword matching system that simulates ML behavior.
 */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Food': ['restaurant', 'cafe', 'mcdonalds', 'starbucks', 'grocery', 'canteen', 'lunch', 'dinner', 'pizza', 'burger', 'zomato', 'swiggy', 'blinkit', 'zepto', 'dominos', 'kfc', 'food', 'eat'],
    'Social Life': ['party', 'club', 'bar', 'drinks', 'coffee', 'hangout', 'friends', 'movie', 'cinema', 'pvr', 'inox', 'theatre'],
    'Pets': ['pet', 'dog', 'cat', 'vet', 'animal', 'pedigree', 'kibble'],
    'Transport': ['uber', 'lyft', 'subway', 'bus', 'train', 'gas', 'fuel', 'metro', 'taxi', 'ola', 'rapido', 'petrol', 'flight', 'ticket'],
    'Culture': ['museum', 'gallery', 'art', 'concert', 'festival', 'exhibition', 'culture'],
    'Household': ['rent', 'utility', 'electricity', 'water', 'gas', 'furniture', 'appliance', 'cleaning', 'laundry', 'detergent', 'household'],
    'Apparel': ['fashion', 'clothing', 'apparel', 'nike', 'adidas', 'zara', 'h&m', 'shirt', 'pants', 'shoes', 'dress', 'shopping'],
    'Beauty': ['makeup', 'salon', 'barber', 'haircut', 'skincare', 'cosmetic', 'beauty', 'spa'],
    'Health': ['doctor', 'hospital', 'medicine', 'pharmacy', 'gym', 'health', 'fitness', 'yoga', 'medical'],
    'Education': ['university', 'college', 'tuition', 'sem', 'fees', 'exam', 'course', 'coursera', 'udemy', 'book', 'stationery', 'pencil', 'notebook', 'education'],
    'Gift': ['gift', 'present', 'birthday', 'anniversary', 'donation', 'charity'],
    'Other': []
};

export function autoCategorize(description: string): string {
    const desc = description.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => desc.includes(kw))) {
            return category;
        }
    }

    return 'Other';
}

interface TransactionLike {
    amount: number;
    description: string;
    date: number;
    category: string;
}

/**
 * Comprehensive Fraud Detection & Risk Scoring System.
 */
export function detectAnomaly(
    amount: number,
    description: string,
    recentTransactions: TransactionLike[]
): { isSuspicious: boolean, riskScore: number, riskLevel: 'Low' | 'Medium' | 'High', fraudReasons: string[] } {
    const now = Date.now();
    const desc = description.toLowerCase();
    const category = autoCategorize(description);

    let score = 0;
    const reasons: string[] = [];

    // 1. Hard Threshold: High spending for a student (Weighted: 45)
    if (amount > 50000) {
        score += 45;
        reasons.push('Amount exceeds standard student limit (₹50k+)');
    }

    // 2. High-Risk Keywords (Weighted: 50)
    const suspiciousKeywords = [
        'casino', 'gambling', 'crypto-scam', 'darkweb', 'betting', 'lottery',
        'fast cash', 'win prize', 'investment fund', 'telegram bot', 'binary options', 'gift card buy'
    ];
    if (suspiciousKeywords.some(kw => desc.includes(kw))) {
        score += 50;
        reasons.push('High-risk keywords or scam-related terms detected');
    }

    // 3. Duplicate Detection (Weighted: 60)
    const tenMinsAgo = now - (10 * 60 * 1000);
    const isDuplicate = recentTransactions.some(t =>
        t.date > tenMinsAgo &&
        t.amount === amount &&
        t.description.toLowerCase() === desc
    );
    if (isDuplicate) {
        score += 60;
        reasons.push('Potential duplicate/unauthorized repeat payment');
    }

    // 4. Time-of-Day Anomaly (Weighted: 30)
    const hour = new Date(now).getHours();
    if (hour >= 1 && hour <= 5) {
        score += 30;
        reasons.push('Transaction occurred during high-risk late-night hours (1 AM - 5 AM)');
    }

    // 5. Velocity Check & Probing Pattern (Weighted: 55)
    const fifteenMinsAgo = now - (15 * 60 * 1000);
    const recentInWindow = recentTransactions.filter(t => t.date > fifteenMinsAgo);

    if (recentInWindow.length >= 3) {
        score += 40;
        reasons.push('High frequency of transactions in a very short window');

        // Detect "Probing": Multiple tiny transactions followed by a larger one
        const smallTxCount = recentInWindow.filter(t => t.amount < 100).length;
        if (smallTxCount >= 2 && amount >= 1000) {
            score += 30;
            reasons.push('Probing pattern detected: Small test amounts followed by a large transaction');
        }
    }

    // 6. Round Number Detection (Weighted: 25)
    // Large round numbers (10k, 25k, 50k) are often signs of manual fraud or "gift" scams
    const isRoundNumber = amount > 5000 && (amount % 1000 === 0 || amount % 5000 === 0);
    if (isRoundNumber) {
        const histAvg = recentTransactions.length > 0
            ? recentTransactions.reduce((s, t) => s + t.amount, 0) / recentTransactions.length
            : 0;
        if (amount > histAvg * 3) {
            score += 25;
            reasons.push('Unusually large round-number transaction (Potential "Gift" or Manual Scam)');
        }
    }

    // 7. Category Outlier Detection (Weighted: 35)
    const categoryTx = recentTransactions.filter(t => t.category === category);
    if (categoryTx.length >= 3) {
        const avg = categoryTx.reduce((sum, t) => sum + t.amount, 0) / categoryTx.length;
        if (amount > avg * 5) {
            score += 35;
            reasons.push(`Spending spike in ${category}: 5x higher than your usual average`);
        }
    }

    // 8. Behavior Profiling (Overall Outlier) (Weighted: 30)
    if (recentTransactions.length >= 5) {
        const globalAvg = recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length;
        if (amount > globalAvg * 10) {
            score += 30;
            reasons.push('Extreme deviation from overall spending habits');
        }
    }

    // 9. Sequential Description Check (Weighted: 40)
    if (recentTransactions.length >= 2) {
        const lastDesc = recentTransactions[0].description.toLowerCase();
        if (desc.includes('test') && lastDesc.includes('test')) {
            score += 40;
            reasons.push('Sequential "test" transactions detected');
        }
    }

    // 10. Health Category Multiplier (Leniency)
    if (category === 'Health') {
        score *= 0.3; // Reduce risk weight significantly for Health
    }

    // Cap score at 100
    const finalScore = Math.min(score, 100);

    // Classify Risk
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (finalScore >= 70) riskLevel = 'High';
    else if (finalScore >= 35) riskLevel = 'Medium';

    return {
        isSuspicious: finalScore >= 35,
        riskScore: finalScore,
        riskLevel,
        fraudReasons: reasons
    };
}
export async function detectAnomalyML(
    amount: number,
    description: string,
    category: string,
    timestamp: number,
    recentTransactions: TransactionLike[]
): Promise<{
    isSuspicious: boolean,
    riskScore: number,
    riskLevel: 'Low' | 'Medium' | 'High',
    fraudReasons: string[],
    confidence: number
}> {
    try {
        const response = await fetch('http://localhost:8000/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount,
                description,
                timestamp,
                category,
                history: recentTransactions.slice(0, 5).map(t => ({ amount: t.amount, category: t.category, date: t.date }))
            })
        });

        if (!response.ok) throw new Error('ML Service unavailable');

        const data = await response.json();

        let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
        if (data.risk_score >= 70) riskLevel = 'High';
        else if (data.risk_score >= 35) riskLevel = 'Medium';

        const reasons = data.reasons.length > 0 ? data.reasons : (data.is_suspicious ? ['ML-identified anomaly'] : []);

        return {
            isSuspicious: data.is_suspicious,
            riskScore: data.risk_score,
            riskLevel,
            fraudReasons: reasons,
            confidence: data.confidence
        };
    } catch (error) {
        console.warn('ML Fraud service failed, falling back to rule-based detection', error);
        // Fallback to existing logic if ML service is down
        const ruleResult = detectAnomaly(amount, description, recentTransactions);
        return { ...ruleResult, confidence: 0 };
    }
}
