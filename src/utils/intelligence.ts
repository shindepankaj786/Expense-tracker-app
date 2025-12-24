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

    // 1. Hard Threshold: High spending for a student (Weighted: 40)
    if (amount > 50000) {
        score += 40;
        reasons.push('Amount exceeds standard student limit (₹50k+)');
    }

    // 2. High-Risk Keywords (Weighted: 50)
    const suspiciousKeywords = ['casino', 'gambling', 'crypto-scam', 'darkweb', 'betting', 'lottery'];
    if (suspiciousKeywords.some(kw => desc.includes(kw))) {
        score += 50;
        reasons.push('High-risk keywords detected in description');
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
        reasons.push('Transaction occurred at unusual late-night hours');
    }

    // 5. Velocity Check (Weighted: 45)
    const fifteenMinsAgo = now - (15 * 60 * 1000);
    const recentCount = recentTransactions.filter(t => t.date > fifteenMinsAgo).length;
    if (recentCount >= 3) {
        score += 45;
        reasons.push('High frequency of transactions in a short window');
    }

    // 6. Category Outlier Detection (Weighted: 35)
    const categoryTx = recentTransactions.filter(t => t.category === category);
    if (categoryTx.length >= 3) {
        const avg = categoryTx.reduce((sum, t) => sum + t.amount, 0) / categoryTx.length;
        if (amount > avg * 5) {
            score += 35;
            reasons.push(`Spending spike in ${category}: 5x higher than your usual average`);
        }
    }

    // 7. Behavior Profiling (Overall Outlier) (Weighted: 25)
    if (recentTransactions.length >= 5) {
        const globalAvg = recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length;
        if (amount > globalAvg * 10) {
            score += 25;
            reasons.push('Massive deviation from overall spending habits');
        }
    }

    // Cap score at 100
    const finalScore = Math.min(score, 100);

    // Classify Risk
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (finalScore >= 60) riskLevel = 'High';
    else if (finalScore >= 30) riskLevel = 'Medium';

    return {
        isSuspicious: finalScore >= 30,
        riskScore: finalScore,
        riskLevel,
        fraudReasons: reasons
    };
}
