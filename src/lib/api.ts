export interface WordSuggestion {
  word: string;
  score: number;
  tags?: string[];
  source: 'datamuse' | 'wikipedia';
}

// Helper to get frequency from tags e.g. ["f:1.234"]
const getFreq = (tags?: string[]) => {
  if (!tags) return 0;
  const fTag = tags.find(t => t.startsWith('f:'));
  return fTag ? parseFloat(fTag.split(':')[1]) : 0;
};

export async function fetchSpecificTypes(parentWord: string, limit: number = 30): Promise<WordSuggestion[]> {
  try {
    const encoded = encodeURIComponent(parentWord);
    // rel_spc: Kinds of (e.g. mammal -> dog)
    const resSpc = await fetch(`https://api.datamuse.com/words?rel_spc=${encoded}&max=${limit}&md=f`);
    let spc = await resSpc.json();
    
    spc = spc.map((item: any) => ({ ...item, source: 'datamuse' }));
    spc.sort((a: any, b: any) => getFreq(b.tags) - getFreq(a.tags));
    return spc;
  } catch (error) {
    console.error("Error fetching specific types:", error);
    return [];
  }
}

export async function fetchRelatedWords(word: string, contextChild?: string, limit: number = 30): Promise<WordSuggestion[]> {
  try {
    const encoded = encodeURIComponent(word);
    
    // If we have a context child, we can query words that mean like the child but are in topic of parent
    let url = `https://api.datamuse.com/words?ml=${encoded}&max=${limit}&md=f`;
    if (contextChild) {
      url = `https://api.datamuse.com/words?ml=${encodeURIComponent(contextChild)}&topics=${encoded}&max=${limit}&md=f`;
    }

    const res = await fetch(url);
    let results = await res.json();
    
    results = results.map((item: any) => ({ ...item, source: 'datamuse' }));
    results.sort((a: any, b: any) => getFreq(b.tags) - getFreq(a.tags));
    return results;
  } catch (error) {
    console.error("Error fetching related words:", error);
    return [];
  }
}

export async function fetchWikipediaSuggestions(query: string, limit: number = 20): Promise<WordSuggestion[]> {
  try {
    // We use OpenSearch API from Wikipedia
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${limit}&namespace=0&format=json&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    
    // data[1] contains the titles of the articles
    const titles: string[] = data[1] || [];
    
    // Map to WordSuggestion format
    return titles.map((title, index) => ({
      word: title.toLowerCase(),
      score: 100 - index, // arbitrary score
      source: 'wikipedia'
    }));
  } catch (error) {
    console.error("Error fetching Wikipedia:", error);
    return [];
  }
}

export async function updateGlobalDictionary(updatedDictionaryData: any): Promise<boolean> {
  try {
    const response = await fetch('/api/update-dictionary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedDictionaryData),
    });

    const result = await response.json();
    if (result.success) {
      console.log('Dictionary updated successfully');
      return true;
    } else {
      console.error('Failed to update dictionary:', result.error);
      return false;
    }
  } catch (err) {
    console.error('Error calling update dictionary API:', err);
    return false;
  }
}
