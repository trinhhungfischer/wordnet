import { useState, useEffect } from 'react';

let currentLang: 'en' | 'vi' = 'en';
let localeCategories: Record<string, string> = {};
let localeWords: Record<string, string> = {};
let localeCategoriesLower: Record<string, string> = {};
let localeWordsLower: Record<string, string> = {};
const listeners = new Set<() => void>();

let initialized = false;

export const initI18n = async () => {
    if (initialized) return;
    try {
        const res = await fetch('/locales/vi.json');
        const data = await res.json();
        localeCategories = data.categories || {};
        localeWords = data.words || {};
        
        Object.entries(localeCategories).forEach(([k, v]) => {
            localeCategoriesLower[k.toLowerCase()] = v as string;
        });
        Object.entries(localeWords).forEach(([k, v]) => {
            localeWordsLower[k.toLowerCase()] = v as string;
        });

        initialized = true;
    } catch(e) {
        console.error('Failed to load locales', e);
    }
};

export const setLang = (lang: 'en' | 'vi') => {
    currentLang = lang;
    listeners.forEach(l => l());
};

export const getLang = () => currentLang;

export const useI18n = () => {
    const [lang, setL] = useState(currentLang);
    
    useEffect(() => {
        const listener = () => setL(currentLang);
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }, []);

    return { lang, setLang };
};

// Global translation functions to be used when mutating the level data
export const translateString = (str: string, toLang: 'en' | 'vi') => {
    if (!str) return str;
    const lower = str.toLowerCase();
    
    // We only have en -> vi mappings, no vi -> en for now
    // Since the data is now strictly Title Case, we can also just lookup directly
    if (toLang === 'vi') {
        const catMap = localeCategoriesLower[lower] || localeCategories[str];
        if (catMap) return catMap;
        const wordMap = localeWordsLower[lower] || localeWords[str];
        if (wordMap) return wordMap;
        return str;
    }
    
    // Reverse lookup (vi -> en) - best effort
    if (toLang === 'en') {
        const matchCat = Object.entries(localeCategories).find(([_, vi]) => vi.toLowerCase() === lower);
        if (matchCat) return matchCat[0];
        
        const matchWord = Object.entries(localeWords).find(([_, vi]) => vi.toLowerCase() === lower);
        if (matchWord) return matchWord[0];
        
        return str;
    }
    
    return str;
};

export const translateLevelData = (
    nodes: any[],
    levelData: any,
    targetLang: 'en' | 'vi'
) => {
    const translate = (s: string) => translateString(s, targetLang);

    // Translate nodes
    const newNodes = nodes.map(n => ({
        ...n,
        data: {
            ...n.data,
            label: translate(n.data.label)
        }
    }));

    // Translate levelData
    const newLevelData = { ...levelData };
    
    if (newLevelData.bubbleSeparatorData?.linkedWords) {
        newLevelData.bubbleSeparatorData.linkedWords = newLevelData.bubbleSeparatorData.linkedWords.map((w: string) => translate(w));
    }
    if (newLevelData.pipes) {
        newLevelData.pipes = newLevelData.pipes.map((p: any) => ({
            ...p,
            words: p.words.map((w: string) => translate(w))
        }));
    }
    if (newLevelData.frozenBubbles) {
        newLevelData.frozenBubbles = newLevelData.frozenBubbles.map((f: any) => ({
            ...f,
            word: translate(f.word)
        }));
    }
    if (newLevelData.crackBubbles) {
        newLevelData.crackBubbles = newLevelData.crackBubbles.map((c: any) => ({
            ...c,
            word: translate(c.word),
            chunkWords: c.chunkWords ? c.chunkWords.map((cw: string) => translate(cw)) : []
        }));
    }
    if (newLevelData.iceBombBubbles) {
        newLevelData.iceBombBubbles = newLevelData.iceBombBubbles.map((i: any) => ({
            ...i,
            word: translate(i.word)
        }));
    }
    if (newLevelData.burstBubbles) {
        newLevelData.burstBubbles = newLevelData.burstBubbles.map((b: any) => ({
            ...b,
            word: translate(b.word)
        }));
    }
    if (newLevelData.backwardBubbles) {
        newLevelData.backwardBubbles = newLevelData.backwardBubbles.map((b: any) => ({
            ...b,
            word: translate(b.word)
        }));
    }

    return { newNodes, newLevelData };
};

export const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸', imgUrl: 'https://flagcdn.com/w40/us.png' },
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', imgUrl: 'https://flagcdn.com/w40/vn.png' }
] as const;


