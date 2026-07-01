import Typesense from 'typesense';
import { db } from '../db';
import { expenses, expenseSplits } from '../db/schema';

// Validate required Typesense env vars at startup — fail loudly rather than
// silently connecting to localhost with a public API key.
const TYPESENSE_HOST = process.env.TYPESENSE_HOST;
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY;

if (!TYPESENSE_HOST || !TYPESENSE_API_KEY) {
  console.warn(
    'WARNING: TYPESENSE_HOST or TYPESENSE_API_KEY is not set. Search will be disabled.'
  );
}

export const typesense = new Typesense.Client({
  nodes: [
    {
      host: TYPESENSE_HOST || 'localhost',
      port: Number(process.env.TYPESENSE_PORT) || 8108,
      protocol: process.env.TYPESENSE_PROTOCOL || 'https',
    },
  ],
  apiKey: TYPESENSE_API_KEY || 'invalid-key',
  connectionTimeoutSeconds: 2,
});

export async function initTypesense() {
  try {
    const collectionsList = await typesense.collections().retrieve();
    let exists = collectionsList.some((c) => c.name === 'expenses');
    
    if (!exists) {
      const schema: any = {
        name: 'expenses',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'amount', type: 'float' },
          { name: 'currency', type: 'string', facet: true },
          { name: 'paidBy', type: 'string', facet: true },
          { name: 'date', type: 'int32' },
          { name: 'category', type: 'string', facet: true, optional: true },
          { name: 'notes', type: 'string', optional: true },
          { name: 'groupId', type: 'string', facet: true, optional: true },
          { name: 'userIds', type: 'string[]', facet: true },
        ],
        default_sorting_field: 'date',
      };
      await typesense.collections().create(schema);
      console.log('Typesense "expenses" collection created successfully.');
      exists = true;
    }

    if (exists) {
      const stats = await typesense.collections('expenses').retrieve();
      if (stats.num_documents === 0) {
        console.log('Backfilling expenses into Typesense search index...');
        const allExpenses = await db.select().from(expenses);
        if (allExpenses.length > 0) {
          const allSplits = await db.select().from(expenseSplits);
          for (const exp of allExpenses) {
            const relatedSplits = allSplits.filter(s => s.expenseId === exp.id);
            const userIdsInvolved = Array.from(new Set([exp.paidBy, ...relatedSplits.map(s => s.userId)]));
            await indexExpense({
              id: exp.id,
              description: exp.description,
              amount: Number(exp.amount),
              currency: exp.currency,
              paidBy: exp.paidBy,
              date: exp.date,
              category: exp.category,
              notes: exp.notes,
              groupId: exp.groupId,
              userIds: userIdsInvolved,
            });
          }
        }
        console.log(`Backfilled ${allExpenses.length} expenses successfully.`);
      }
    }
  } catch (error) {
    console.error('Failed to initialize Typesense:', error);
  }
}

export async function indexExpense(expense: {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  date: Date;
  category?: string | null;
  notes?: string | null;
  groupId?: string | null;
  userIds: string[];
}) {
  try {
    const document = {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      paidBy: expense.paidBy,
      date: Math.floor(expense.date.getTime() / 1000),
      category: expense.category || '',
      notes: expense.notes || '',
      groupId: expense.groupId || '',
      userIds: expense.userIds,
    };
    await typesense.collections('expenses').documents().upsert(document);
  } catch (error) {
    console.error(`Error indexing expense ${expense.id} in Typesense:`, error);
  }
}

export async function deleteExpenseFromIndex(expenseId: string) {
  try {
    await typesense.collections('expenses').documents(expenseId).delete();
  } catch (error) {
    console.error(`Error deleting expense ${expenseId} from Typesense:`, error);
  }
}

export async function searchExpenses(userId: string, query: string, groupId?: string) {
  try {
    let filterBy = `userIds:=[${userId}]`;
    if (groupId) {
      filterBy += ` && groupId:=${groupId}`;
    }
    const searchResults = await typesense.collections('expenses').documents().search({
      q: query,
      query_by: 'description,notes,category',
      filter_by: filterBy,
      sort_by: 'date:desc',
    });
    return searchResults.hits?.map(h => h.document) || [];
  } catch (error) {
    console.error('Error searching expenses in Typesense:', error);
    return [];
  }
}
