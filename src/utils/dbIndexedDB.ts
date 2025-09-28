// Cache apenas por dbName
const dbPromises = new Map<string, Promise<IDBDatabase>>();

const KNOWN_STORES = ["keys", "messages"];

export function openDB(dbName: string, storeName: string): Promise<IDBDatabase> {
  if (dbPromises.has(dbName)) {
    return dbPromises.get(dbName)!;
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onsuccess = () => {
      const db = request.result;

      if (db.objectStoreNames.contains(storeName)) {
        resolve(db);
        return;
      }

      const newVersion = db.version + 1;
      db.close();

      const upgradeRequest = indexedDB.open(dbName, newVersion);

      upgradeRequest.onupgradeneeded = () => {
        const upgradeDb = upgradeRequest.result;

        // Cria todas as stores conhecidas se não existirem
        for (const s of KNOWN_STORES) {
          if (!upgradeDb.objectStoreNames.contains(s)) {
            upgradeDb.createObjectStore(s);
            console.log(`Object store '${s}' criado`);
          }
        }
      };

      upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);
      upgradeRequest.onerror = () => reject(upgradeRequest.error);
    };

    request.onerror = () => reject(request.error);
  });

  dbPromises.set(dbName, promise);
  return promise;
}



export async function saveItem(dbName: string, storeName: string, key: string, value: any) {
    try {
        const db = await openDB(dbName, storeName);
        
        return new Promise<void>((resolve, reject) => {
            // Verifica se o store existe antes da transação
            if (!db.objectStoreNames.contains(storeName)) {
                reject(new Error(`Object store '${storeName}' não existe`));
                return;
            }
            
            const tx = db.transaction(storeName, "readwrite");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            
            const store = tx.objectStore(storeName);
            store.put(value, key);
        });
    } catch (error) {
        console.error('Error in saveItem:', error);
        throw error;
    }
}

export async function loadItem(dbName: string, storeName: string, key: string) {
    try {
        const db = await openDB(dbName, storeName);
        
        return new Promise<any>((resolve, reject) => {
            if (!db.objectStoreNames.contains(storeName)) {
                resolve(undefined); // Retorna undefined se store não existe
                return;
            }
            
            const tx = db.transaction(storeName, "readonly");
            const request = tx.objectStore(storeName).get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error in loadItem:', error);
        return undefined;
    }
}

export async function removeItem(dbName: string, storeName: string, key: string) {
    try {
        const db = await openDB(dbName, storeName);
        
        return new Promise<void>((resolve, reject) => {
            if (!db.objectStoreNames.contains(storeName)) {
                resolve(); // Já não existe, então sucesso
                return;
            }
            
            const tx = db.transaction(storeName, "readwrite");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            
            tx.objectStore(storeName).delete(key);
        });
    } catch (error) {
        console.error('Error in removeItem:', error);
        throw error;
    }
}

// Função utilitária para verificar se um store existe
export async function storeExists(dbName: string, storeName: string): Promise<boolean> {
    try {
        const db = await openDB(dbName, storeName);
        return db.objectStoreNames.contains(storeName);
    } catch (error) {
        return false;
    }
}