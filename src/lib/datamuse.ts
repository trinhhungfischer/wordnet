export interface DatamuseWord {
  word: string;
  score: number;
  tags?: string[];
}

/**
 * Fetches specific kinds of a word (hyponyms)
 * e.g. "animal" -> "dog", "cat", etc.
 */
export async function fetchChildrenWords(parentWord: string, limit: number = 40): Promise<DatamuseWord[]> {
  try {
    const encoded = encodeURIComponent(parentWord);
    // Fetch specific kinds (hyponyms)
    const resSpc = await fetch(`https://api.datamuse.com/words?rel_spc=${encoded}&max=${limit}&md=f`);
    const spc = await resSpc.json();
    
    // Fetch related/associated words (triggers)
    const resTrg = await fetch(`https://api.datamuse.com/words?rel_trg=${encoded}&max=${limit}&md=f`);
    const trg = await resTrg.json();

    // Fetch similar meaning words
    const resMl = await fetch(`https://api.datamuse.com/words?ml=${encoded}&max=${limit}&md=f`);
    const ml = await resMl.json();

    // Combine and deduplicate
    const combined = [...spc, ...trg, ...ml];
    const uniqueMap = new Map<string, DatamuseWord>();
    
    for (const item of combined) {
      if (!uniqueMap.has(item.word)) {
        uniqueMap.set(item.word, item);
      }
    }
    
    const result = Array.from(uniqueMap.values());
    
    // Helper to get frequency from tags e.g. ["f:1.234"]
    const getFreq = (word: DatamuseWord) => {
      if (!word.tags) return 0;
      const fTag = word.tags.find(t => t.startsWith('f:'));
      return fTag ? parseFloat(fTag.split(':')[1]) : 0;
    };
    
    // Sort by frequency descending
    result.sort((a, b) => getFreq(b) - getFreq(a));
    
    return result.slice(0, limit);
  } catch (error) {
    console.error("Error fetching children words:", error);
    return [];
  }
}

/**
 * Fetches general categories for a word (hypernyms)
 * e.g. "dog" -> "animal", "canine"
 */
export async function fetchParentWords(childWord: string, limit: number = 20): Promise<DatamuseWord[]> {
  try {
    const response = await fetch(`https://api.datamuse.com/words?rel_gen=${encodeURIComponent(childWord)}&max=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch from Datamuse API');
    return await response.json();
  } catch (error) {
    console.error("Error fetching parent words:", error);
    return [];
  }
}

/**
 * Fetches closely related words if no specific parent/child found
 */
export async function fetchRelatedWords(word: string, limit: number = 20): Promise<DatamuseWord[]> {
  try {
    const response = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch from Datamuse API');
    return await response.json();
  } catch (error) {
    console.error("Error fetching related words:", error);
    return [];
  }
}
