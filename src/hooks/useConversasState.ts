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
      // Se já existe, não sobrescrever
      if (prev[conversa.chatId]) {
        console.log('ℹ️ [initializeConversa] Conversa já existe, mantendo estado atual');
        return prev;
      }

      const newState = {
        ...prev,
        [conversa.chatId]: {
          conversa: { ...conversa }, // Criar nova referência
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
      
      // Se não existe, criar nova entrada
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

      // Se existe, atualizar
      const updatedState = {
        ...currentState,
        ...updates,
        // Garantir que a conversa mantenha o chatId correto
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
        estadoNovo: updatedState,
        todasConversas: Object.keys(newState)
      });
      
      return newState;
    });
  }, []);

  const getConversaState = useCallback((conversaId: number | null): ConversaState | null => {
    if (!conversaId || conversaId === 0) {
      console.log('⚠️ [getConversaState] conversaId inválido:', conversaId);
      return null;
    }
    
    const state = conversasState[conversaId] || null;
    console.log('🔍 [getConversaState] Buscando estado:', { 
      conversaId, 
      encontrado: !!state,
      estado: state 
    });
    return state;
  }, [conversasState]);

  // Função para atualizar apenas a conversa
  const updateConversaOnly = useCallback((conversaId: number, conversaUpdates: Partial<Conversa>) => {
    if (!conversaId || conversaId === 0) {
      console.log('⚠️ [updateConversaOnly] conversaId inválido:', conversaId);
      return;
    }

    console.log('🔄 [updateConversaOnly] Atualizando apenas conversa:', conversaId, conversaUpdates);
    
    setConversasState(prev => {
      const currentState = prev[conversaId];
      if (!currentState) {
        console.log('❌ [updateConversaOnly] Conversa não encontrada:', conversaId);
        return prev;
      }

      const updatedConversa = {
        ...currentState.conversa,
        ...conversaUpdates,
        chatId: conversaId // Garantir que o chatId não seja alterado
      };

      const newState = {
        ...prev,
        [conversaId]: {
          ...currentState,
          conversa: updatedConversa
        }
      };

      console.log('✅ [updateConversaOnly] Conversa atualizada:', updatedConversa);
      return newState;
    });
  }, []);

  // Função para atualizar apenas as chaves
  const updateConversaKeys = useCallback((conversaId: number, keys: { myPublicKey?: ArrayBuffer | null; otherPublicKey?: ArrayBuffer | null }) => {
    if (!conversaId || conversaId === 0) {
      console.log('⚠️ [updateConversaKeys] conversaId inválido:', conversaId);
      return;
    }

    console.log('🔄 [updateConversaKeys] Atualizando chaves:', conversaId, {
      myPublicKey: keys.myPublicKey ? `✅ ${keys.myPublicKey.byteLength} bytes` : '❌ Nulo',
      otherPublicKey: keys.otherPublicKey ? `✅ ${keys.otherPublicKey.byteLength} bytes` : '❌ Nulo'
    });
    
    setConversasState(prev => {
      const currentState = prev[conversaId];
      if (!currentState) {
        console.log('❌ [updateConversaKeys] Conversa não encontrada:', conversaId);
        return prev;
      }

      const newState = {
        ...prev,
        [conversaId]: {
          ...currentState,
          myPublicKey: keys.myPublicKey !== undefined ? keys.myPublicKey : currentState.myPublicKey,
          otherPublicKey: keys.otherPublicKey !== undefined ? keys.otherPublicKey : currentState.otherPublicKey
        }
      };

      console.log('✅ [updateConversaKeys] Chaves atualizadas');
      return newState;
    });
  }, []);

  // Função para remover conversa
  const removeConversa = useCallback((conversaId: number) => {
    if (!conversaId || conversaId === 0) {
      console.log('⚠️ [removeConversa] conversaId inválido:', conversaId);
      return;
    }

    console.log('🗑️ [removeConversa] Removendo conversa:', conversaId);
    
    setConversasState(prev => {
      const newState = { ...prev };
      delete newState[conversaId];
      
      console.log('✅ [removeConversa] Conversa removida. Total:', Object.keys(newState).length);
      return newState;
    });
  }, []);

  // Função para debug do estado atual
  const debugState = useCallback(() => {
    console.log('📊 [debugState] Estado completo das conversas:', {
      totalConversas: Object.keys(conversasState).length,
      conversas: Object.entries(conversasState).map(([id, state]) => ({
        id,
        otherUserName: state.conversa.otherUserName,
        status: state.conversa.statusChat,
        myPublicKey: state.myPublicKey ? '✅' : '❌',
        otherPublicKey: state.otherPublicKey ? '✅' : '❌'
      }))
    });
  }, [conversasState]);

  // Função para obter todas as conversas
  const getAllConversas = useCallback((): ConversaState[] => {
    return Object.values(conversasState);
  }, [conversasState]);

  // Função para verificar se conversa existe
  const hasConversa = useCallback((conversaId: number): boolean => {
    return !!conversasState[conversaId];
  }, [conversasState]);

  return {
    conversasState,
    initializeConversa,
    updateConversaState,
    updateConversaOnly,
    updateConversaKeys,
    removeConversa,
    getConversaState,
    getAllConversas,
    hasConversa,
    debugState,
  };
}