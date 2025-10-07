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
    console.log('🔄 [initializeConversa] Inicializando conversa:', conversa.chatId);
    
    setConversasState(prev => {
      if (prev[conversa.chatId]) {
        console.log('ℹ️ [initializeConversa] Conversa já existe, mantendo estado atual');
        return prev;
      }

      const newState = {
        ...prev,
        [conversa.chatId]: {
          conversa: { ...conversa },
          myPublicKey: null,
          otherPublicKey: null,
        }
      };
      
      console.log('✅ [initializeConversa] Estado atualizado:', {
        chatId: conversa.chatId,
        todasConversas: Object.keys(newState)
      });
      return newState;
    });
  }, []);

  const updateConversaState = useCallback((conversaId: number, updates: Partial<ConversaState>) => {
    if (!conversaId || conversaId === 0) {
      console.log('⚠️ [updateConversaState] conversaId inválido:', conversaId);
      return;
    }

    console.log('🔄 [updateConversaState] Atualizando conversa:', conversaId, updates);
    
    setConversasState(prev => {
      const currentState = prev[conversaId];
      
      if (!currentState) {
        console.log('⚠️ [updateConversaState] Conversa não encontrada, criando nova...');
        const newState = {
          ...prev,
          [conversaId]: {
            conversa: updates.conversa || { 
              chatId: conversaId, 
              otherUserId: 0, 
              otherUserName: 'Unknown',
              statusChat: 'Pending',
              accepted: false
            },
            myPublicKey: updates.myPublicKey || null,
            otherPublicKey: updates.otherPublicKey || null,
          }
        };
        console.log('✅ [updateConversaState] Nova conversa criada:', newState[conversaId]);
        return newState;
      }

      const updatedState = {
        ...currentState,
        ...updates,
        conversa: updates.conversa ? { 
          ...updates.conversa, 
          chatId: conversaId 
        } : currentState.conversa
      };

      const newState = {
        ...prev,
        [conversaId]: updatedState
      };
      
      console.log('✅ [updateConversaState] Estado atualizado:', {
        conversaId,
        estadoAnterior: currentState,
        estadoNovo: updatedState
      });
      
      return newState;
    });
  }, []);

  const updateConversaStatus = useCallback((conversaId: number, status: 'Pending' | 'Active' | 'Blocked' | null, accepted?: boolean) => {
    if (!conversaId || conversaId === 0) {
      console.log('⚠️ [updateConversaStatus] conversaId inválido:', conversaId);
      return;
    }

    console.log('🔄 [updateConversaStatus] Atualizando status:', { conversaId, status, accepted });
    
    setConversasState(prev => {
      const currentState = prev[conversaId];
      
      if (!currentState) {
        console.log('❌ [updateConversaStatus] Conversa não encontrada:', conversaId);
        return prev;
      }

      const updatedConversa = {
        ...currentState.conversa,
        statusChat: status,
        ...(accepted !== undefined && { accepted })
      };

      const newState = {
        ...prev,
        [conversaId]: {
          ...currentState,
          conversa: updatedConversa
        }
      };

      console.log('✅ [updateConversaStatus] Status atualizado:', updatedConversa);
      return newState;
    });
  }, []);

  const updateConversaComNovoId = useCallback((antigoChatId: number, novoChatId: number, conversaAtualizada: Conversa) => {
    if (!antigoChatId || !novoChatId) {
      console.log('⚠️ [updateConversaComNovoId] IDs inválidos:', { antigoChatId, novoChatId });
      return;
    }

    console.log('🔄 [updateConversaComNovoId] Atualizando ID da conversa:', {
      de: antigoChatId,
      para: novoChatId
    });
    
    setConversasState(prev => {
      const currentState = prev[antigoChatId];
      
      if (!currentState) {
        console.log('❌ [updateConversaComNovoId] Conversa antiga não encontrada:', antigoChatId);
        return prev;
      }

      const newState = { ...prev };
      delete newState[antigoChatId];
      
      newState[novoChatId] = {
        ...currentState,
        conversa: conversaAtualizada
      };

      console.log('✅ [updateConversaComNovoId] Conversa movida para novo ID:', {
        antigoChatId,
        novoChatId,
        conversa: conversaAtualizada
      });

      return newState;
    });
  }, []);

  const getConversaState = useCallback((conversaId: number | null): ConversaState | null => {
    if (!conversaId || conversaId === 0) {
      return null;
    }
    
    const state = conversasState[conversaId] || null;
    return state;
  }, [conversasState]);

  const updateConversaOnly = useCallback((conversaId: number, conversaUpdates: Partial<Conversa>) => {
    if (!conversaId || conversaId === 0) return;

    setConversasState(prev => {
      const currentState = prev[conversaId];
      if (!currentState) return prev;

      const updatedConversa = {
        ...currentState.conversa,
        ...conversaUpdates,
        chatId: conversaId
      };

      return {
        ...prev,
        [conversaId]: {
          ...currentState,
          conversa: updatedConversa
        }
      };
    });
  }, []);

  const updateConversaKeys = useCallback((conversaId: number, keys: { myPublicKey?: ArrayBuffer | null; otherPublicKey?: ArrayBuffer | null }) => {
    if (!conversaId || conversaId === 0) return;
    
    setConversasState(prev => {
      const currentState = prev[conversaId];
      if (!currentState) return prev;

      return {
        ...prev,
        [conversaId]: {
          ...currentState,
          myPublicKey: keys.myPublicKey !== undefined ? keys.myPublicKey : currentState.myPublicKey,
          otherPublicKey: keys.otherPublicKey !== undefined ? keys.otherPublicKey : currentState.otherPublicKey
        }
      };
    });
  }, []);

  const removeConversa = useCallback((conversaId: number) => {
    if (!conversaId || conversaId === 0) return;
    
    setConversasState(prev => {
      const newState = { ...prev };
      delete newState[conversaId];
      return newState;
    });
  }, []);

  const debugState = useCallback(() => {
    console.log('📊 [debugState] Estado completo das conversas:', {
      totalConversas: Object.keys(conversasState).length,
      conversas: Object.entries(conversasState).map(([id, state]) => ({
        id,
        otherUserName: state.conversa.otherUserName,
        status: state.conversa.statusChat,
        accepted: state.conversa.accepted,
        myPublicKey: state.myPublicKey ? '✅' : '❌',
        otherPublicKey: state.otherPublicKey ? '✅' : '❌'
      }))
    });
  }, [conversasState]);

  const getAllConversas = useCallback((): ConversaState[] => {
    return Object.values(conversasState);
  }, [conversasState]);

  const hasConversa = useCallback((conversaId: number): boolean => {
    return !!conversasState[conversaId];
  }, [conversasState]);

  return {
    conversasState,
    initializeConversa,
    updateConversaState,
    updateConversaStatus,
    updateConversaComNovoId,
    updateConversaOnly,
    updateConversaKeys,
    removeConversa,
    getConversaState,
    getAllConversas,
    hasConversa,
    debugState,
  };
}