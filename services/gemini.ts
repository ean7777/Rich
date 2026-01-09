
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

const BRAND_MAPPING: Record<string, string> = {
  'монтал': 'montale', 'монталь': 'montale', 'байредо': 'byredo', 'баредо': 'byredo',
  'килиан': 'kilian', 'крид': 'creed', 'экс нихило': 'ex nihilo', 'экснихило': 'ex nihilo',
  'флер наркотик': 'fleur narcotique', 'наркотик': 'narcotique', 'ганимед': 'ganymede',
  'манкёра': 'mancera', 'мансера': 'mancera', 'тизиана терензи': 'tiziana terenzi',
  'терези': 'terenzi', 'том форд': 'tom ford', 'шанель': 'chanel', 'диор': 'dior',
  'гуччи': 'gucci', 'версаче': 'versace', 'амуаж': 'amouage', 'мемо': 'memo',
  'ерба пура': 'erba pura', 'ксерофф': 'xerjoff', 'бакарат': 'baccarat', 'бакара': 'baccarat',
  'руж': 'rouge', 'джульетта': 'juliette has a gun', 'ле лабо': 'le labo', 'прада': 'prada',
  'эрмес': 'hermes', 'герлен': 'guerlain'
};

const findRelevantProducts = (query: string, products: Product[], limit = 100): Product[] => {
  if (!products || products.length === 0) return [];
  const lowerQuery = query.toLowerCase();
  const searchTerms = lowerQuery.split(/\s+/).filter(t => t.length > 1);
  const expandedTerms = [...searchTerms];
  
  searchTerms.forEach(term => {
    if (BRAND_MAPPING[term]) BRAND_MAPPING[term].split(/\s+/).forEach(t => expandedTerms.push(t));
    Object.entries(BRAND_MAPPING).forEach(([rus, eng]) => { 
      if (eng.includes(term)) expandedTerms.push(rus); 
    });
  });

  if (expandedTerms.length === 0) return products.slice(0, 30);

  const scored = products.map(p => {
    let score = 0;
    const brand = (p.brand || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const searchText = `${brand} ${name} ${(p.category || '').toLowerCase()}`;
    
    expandedTerms.forEach(term => {
      if (searchText.includes(term)) {
        score += 2;
        if (brand.includes(term)) score += 15;
        if (name.includes(term)) score += 8;
      }
    });
    return { product: p, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.product);
};

export const queryGemini = async (
  prompt: string, 
  products: Product[], 
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const relevantProducts = findRelevantProducts(prompt, products);
    const contextSnippet = relevantProducts.length > 0 ? relevantProducts : products.slice(0, 30);

    const systemInstruction = `
      Вы — эксперт-консультант "Rich Flavour" (Оригинальная парфюмерия).
      
      КОНТЕКСТ:
      ${JSON.stringify(contextSnippet)}
      
      ПРАВИЛА:
      1. Консультируйте ТОЛЬКО по парфюмерии из списка выше.
      2. ФОРМАТ СПИСКА: Каждая позиция С НОВОЙ СТРОКИ, начиная с "•".
      3. ШАБЛОН: • Бренд Название — Цена.
      4. Если товара нет в списке, вежливо предложите альтернативу или уточните, что его сейчас нет в наличии.
      5. В конце ответов про заказ упоминайте администратора группы.
    `;

    const contents = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: { systemInstruction, temperature: 0.1 }
    });

    return (response.text || "Ничего не найдено. Попробуйте изменить запрос.").trim();
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // Обработка лимитов бесплатного режима
    if (error?.message?.includes('429') || error?.status === 429) {
      return "⚠️ Очередь запросов переполнена (лимит бесплатного режима). Подождите 10-15 секунд и попробуйте снова! ✨";
    }
    
    return "Произошла техническая заминка. Пожалуйста, попробуйте еще раз через минуту.";
  }
};
