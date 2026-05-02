import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  QuerySnapshot,
  DocumentData,
  limit,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Trade } from '../types';

const TRADES_COLLECTION = 'trades';

/**
 * Validates connection to Firestore as per critical constraint.
 */
export async function testFirestoreConnection() {
  try {
    // Attempt to fetch a non-existent doc from a 'test' collection to verify connectivity
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log("Firestore connection verified.");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase is offline. Check configuration.");
    }
    // We don't throw here to avoid crashing the app, just log
    return false;
  }
}

export function subscribeToTrades(userId: string, callback: (trades: Trade[]) => void) {
  const q = query(
    collection(db, TRADES_COLLECTION),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const trades = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trade[];
    callback(trades);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, TRADES_COLLECTION);
  });
}

export async function addTrade(trade: Omit<Trade, 'id'>) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User must be authenticated');

    const tradeData = {
      ...trade,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, TRADES_COLLECTION), tradeData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, TRADES_COLLECTION);
  }
}

export async function updateTradeStatus(tradeId: string, status: Trade['status'], extra?: Partial<Trade>) {
  try {
    const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
    await updateDoc(tradeRef, {
      status,
      ...extra,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TRADES_COLLECTION}/${tradeId}`);
  }
}

export async function getHistoricalTradesForRAG(userId: string, count: number = 20): Promise<Trade[]> {
  const path = TRADES_COLLECTION;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(count)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trade[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function deleteTrade(tradeId: string) {
  try {
    const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
    await deleteDoc(tradeRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${TRADES_COLLECTION}/${tradeId}`);
  }
}
