import { getHeadlines, deleteHeadlines, saveHeadlines, getAllRecords } from '@/lib/db/queries';
import { generateEmbedding } from '@/lib/ai/custom-embedding-model';
import DBSCAN from 'density-clustering/lib/DBSCAN';

const MAX_HEADLINES = 10;
const DBSCAN_EPSILON = 0.35;
const DBSCAN_MIN_POINTS = 2;

const EVERGREEN_TOPICS = [
  "Food Information",
  "Delivery Orders",
  "Promotions",
  "Restaurant Information",
  "The McDonald's App",
  "Gift Certificates",
  "Large Orders",
  "McDelivery Service",
  "Drive-Thru",
  "Happy Meal",
  "Celebrating Birthdays",
];

function cosineDist(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 1 : 1 - dot / denom;
}

function extractKeywords(texts: string[], topN = 5): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
    'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our',
    'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
    'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'when',
    'where', 'why', 'how', 'all', 'about', 'up',
  ]);

  const wordCounts = new Map<string, number>();
  const docFreq = new Map<string, number>();

  for (const text of texts) {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
    const seen = new Set<string>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      if (!seen.has(word)) {
        docFreq.set(word, (docFreq.get(word) ?? 0) + 1);
        seen.add(word);
      }
    }
  }

  const scored = [...wordCounts.entries()].map(([word, count]) => {
    const df = docFreq.get(word) ?? 1;
    const tfidf = count * Math.log(texts.length / df);
    return { word, score: tfidf };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(s => s.word);
}

function countByKey(arr: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

interface RecordRow {
  summary: string | null;
  category: string;
  evergreen_topics: string[] | null;
}

async function embedSummaries(summaries: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const s of summaries) {
    embeddings.push(await generateEmbedding(s));
  }
  return embeddings;
}

function runDBSCAN(embeddings: number[][], epsilon: number, minPoints: number): number[] {
  const dbscan = new DBSCAN();
  const clusters: number[][] = dbscan.run(embeddings, epsilon, minPoints, cosineDist);

  const labels = new Array(embeddings.length).fill(-1);
  for (let cid = 0; cid < clusters.length; cid++) {
    for (const idx of clusters[cid]) {
      labels[idx] = cid;
    }
  }
  return labels;
}

function buildHeadlines(
  records: RecordRow[],
  summaries: string[],
  labels: number[],
  headlineType: string,
) {
  const total = summaries.length;
  const clusterIds = new Set(labels.filter(l => l !== -1));

  const headlines: any[] = [];

  for (const cid of clusterIds) {
    const indices = labels.map((l, i) => (l === cid ? i : -1)).filter(i => i !== -1);
    const clusterTexts = indices.map(i => summaries[i]);
    const clusterCategories = indices.map(i => records[i].category || '');

    const pct = Math.round((indices.length / total) * 1000) / 10;
    const keywords = extractKeywords(clusterTexts, 5);
    const title = keywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ');
    const catCounts = countByKey(clusterCategories);
    const topCategory = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

    headlines.push({
      title,
      match_percent: String(pct),
      desc: `Cluster of ${indices.length} records (${pct}% of total). Key terms: ${keywords.join(', ')}.`,
      entities: keywords.join(', '),
      examples: clusterTexts.slice(0, 3).join(' | '),
      category: topCategory,
      date_processed: new Date(),
      type: headlineType,
      topic: null,
      score: null,
    });
  }

  headlines.sort((a, b) => Number.parseFloat(b.match_percent) - Number.parseFloat(a.match_percent));
  return headlines.slice(0, MAX_HEADLINES);
}

function buildEvergreenHeadlines(
  records: RecordRow[],
  summaries: string[],
  embeddings: number[][],
) {
  const headlines: any[] = [];

  for (const topic of EVERGREEN_TOPICS) {
    const indices: number[] = [];
    for (let i = 0; i < records.length; i++) {
      if (records[i].evergreen_topics?.includes(topic)) {
        indices.push(i);
      }
    }

    if (indices.length < DBSCAN_MIN_POINTS) continue;

    const topicTexts = indices.map(i => summaries[i]);
    const topicEmbeddings = indices.map(i => embeddings[i]);

    if (indices.length >= DBSCAN_MIN_POINTS * 2) {
      const subLabels = runDBSCAN(topicEmbeddings, DBSCAN_EPSILON, DBSCAN_MIN_POINTS);
      const subClusters = new Set(subLabels.filter(l => l !== -1));

      let count = 0;
      for (const cid of subClusters) {
        if (count >= 3) break;
        const subIndices = subLabels.map((l, i) => (l === cid ? i : -1)).filter(i => i !== -1);
        const subTexts = subIndices.map(j => topicTexts[j]);
        const keywords = extractKeywords(subTexts, 5);

        headlines.push({
          title: keywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', '),
          match_percent: 'N/A',
          desc: `Sub-trend in '${topic}' with ${subIndices.length} records. Key terms: ${keywords.join(', ')}.`,
          entities: keywords.join(', '),
          examples: subTexts.slice(0, 3).join(' | '),
          category: 'Evergreen',
          date_processed: new Date(),
          type: 'evergreen',
          topic,
          score: null,
        });
        count++;
      }
    } else {
      const keywords = extractKeywords(topicTexts, 5);
      headlines.push({
        title: keywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', '),
        match_percent: 'N/A',
        desc: `Evergreen topic '${topic}' with ${indices.length} records. Key terms: ${keywords.join(', ')}.`,
        entities: keywords.join(', '),
        examples: topicTexts.slice(0, 3).join(' | '),
        category: 'Evergreen',
        date_processed: new Date(),
        type: 'evergreen',
        topic,
        score: null,
      });
    }
  }

  return headlines;
}

export async function GET() {
  try {
    const currentHeadlines = await getHeadlines();
    return Response.json(currentHeadlines);
  } catch (error) {
    console.error("Error fetching headlines:", error);
    return new Response("Error fetching headlines", { status: 500 });
  }
}

export async function DELETE() {
  try {
    await deleteHeadlines();
    return Response.json({ message: "Headlines deleted" });
  } catch (error) {
    console.error("Error deleting headlines:", error);
    return new Response("Error deleting headlines", { status: 500 });
  }
}

export async function POST() {
  try {
    const allRecords = await getAllRecords();

    const validRecords = allRecords.filter(
      (r) => r.summary && r.summary.trim() !== '',
    );

    if (validRecords.length === 0) {
      return Response.json({ message: 'No records with summaries found', count: 0 }, { status: 200 });
    }

    const summaries = validRecords.map((r) => r.summary as string);

    console.log(`Embedding ${summaries.length} summaries...`);
    const embeddings = await embedSummaries(summaries);

    console.log('Running DBSCAN clustering...');
    const labels = runDBSCAN(embeddings, DBSCAN_EPSILON, DBSCAN_MIN_POINTS);
    const nClusters = new Set(labels.filter((l) => l !== -1)).size;
    const nNoise = labels.filter((l) => l === -1).length;
    console.log(`Found ${nClusters} clusters, ${nNoise} noise points`);

    const overallHeadlines = buildHeadlines(validRecords, summaries, labels, 'overall');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentIndices: number[] = [];
    for (let i = 0; i < validRecords.length; i++) {
      if (new Date(validRecords[i].creationDate) >= yesterday) {
        recentIndices.push(i);
      }
    }

    let todayHeadlines: any[] = [];
    if (recentIndices.length >= DBSCAN_MIN_POINTS) {
      const recentSummaries = recentIndices.map((i) => summaries[i]);
      const recentEmbeddings = recentIndices.map((i) => embeddings[i]);
      const recentRecords = recentIndices.map((i) => validRecords[i]);
      const recentLabels = runDBSCAN(recentEmbeddings, DBSCAN_EPSILON, DBSCAN_MIN_POINTS);
      todayHeadlines = buildHeadlines(recentRecords, recentSummaries, recentLabels, 'today');
    }

    const evergreenHeadlines = buildEvergreenHeadlines(validRecords, summaries, embeddings);

    const allHeadlines = [...overallHeadlines, ...todayHeadlines, ...evergreenHeadlines];

    await deleteHeadlines();
    await saveHeadlines(allHeadlines);

    console.log(`Saved ${allHeadlines.length} headlines`);

    return Response.json(
      { message: 'Headlines generated via DBSCAN', count: allHeadlines.length },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error generating headlines:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return Response.json({ error: 'Failed to generate headlines', detail }, { status: 500 });
  }
}
