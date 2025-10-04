import { useState, useCallback } from 'react';
import type { Conversa } from './useChatMessages';

export interface ConversaState {
  conversa: Conversa;
  myPublicKey: ArrayBuffer | null;
  otherPublicKey: ArrayBuffer | null;
}

export function useConversasState() {
  const [conversasState, setConversasState] = useState<Record<number, ConversaState>>({});

  const initializeConversa = useCallback((conversa: Conversa) => {
    setConversasState(prev => ({
      ...prev,
      [conversa.chatId]: {
        conversa,
        myPublicKey: null,
        otherPublicKey: null,
      }
    }));
  }, []);

  const updateConversaState = useCallback((conversaId: number, updates: Partial<ConversaState>) => {
    setConversasState(prev => ({
      ...prev,
      [conversaId]: {
        ...prev[conversaId],
        ...updates,
      }
    }));
  }, []);

  const getConversaState = useCallback((conversaId: number | null): ConversaState | null => {
    if (!conversaId) return null;
    return conversasState[conversaId] || null;
  }, [conversasState]);

  return {
    conversasState,
    initializeConversa,
    updateConversaState,
    getConversaState,
  };
}