import Dexie, { Table } from 'dexie';
import CryptoJS from 'crypto-js';

// Simple encryption/decryption based on a secret (in a real app, this would be user-provided or from a protected keystore)
const SECRET = 'student-fintech-top-secret-2025';

export interface Transaction {
    id?: number;
    userId: number;
    amount: number;
    description: string;
    category: string;
    date: number;
    isSuspicious: boolean;
    suspicionReason?: string;
    riskScore?: number; // 0-100
    riskLevel?: 'Low' | 'Medium' | 'High';
    fraudReasons?: string[];
    encrypted?: string; // For data privacy-first local storage
}

export interface PlannedPayment {
    id?: number;
    userId: number;
    description: string;
    amount: number;
    date: number; // Scheduled timestamp
    isCompleted: boolean;
}

export interface BudgetLimit {
    id?: number;
    userId: number;
    category: string;
    limit: number;
}

export interface GroupMember {
    email: string;
    balance: number;
}

export interface Group {
    id?: number;
    userId: number;
    name: string;
    members: GroupMember[];
    activity: {
        description: string;
        amount: number;
        paidBy: string; // Member email
        date: number;
    }[];
}

export interface User {
    id?: number;
    email: string;
    password: string;
    fullName: string;
    initialBalance: number;
    createdAt: number;
}

export class FinDatabase extends Dexie {
    transactions!: Table<Transaction>;
    plannedPayments!: Table<PlannedPayment>;
    budgets!: Table<BudgetLimit>;
    groups!: Table<Group>;
    users!: Table<User>;

    constructor() {
        super('FinStudentDB');
        this.version(6).stores({
            transactions: '++id, userId, date, category, isSuspicious',
            plannedPayments: '++id, userId, date, isCompleted',
            budgets: '++id, userId, category',
            groups: '++id, userId, name',
            users: '++id, &email'
        });
    }
    // Encryption helper
    encrypt(data: string): string {
        return CryptoJS.AES.encrypt(data, SECRET).toString();
    }

    // Decryption helper
    decrypt(ciphertext: string): string {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}

export const db = new FinDatabase();
