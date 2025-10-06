// hooks/useChatKeys.ts
import { useState, useCallback, useEffect } from 'react';
import { saveItem } from '../utils/dbIndexedDB';
import { salvarChavePrivada, recuperarChavePrivada } from '../utils/keysIndexedDB';
import { gerarChaves } from '../utils/keys';
import { exportPrivateKey, exportPublicKey } from '../utils/crypto/rsa';
import { getPublicKeys, registerPublicKey } from '../api/signalR';

export function useChatKeys(conversaId: number | null) {
  const [myPrivateKey, setMyPrivateKey] = useState<CryptoKey | null>(null);
  const [myPublicKey, setMyPublicKey] = useState<ArrayBuffer | null>(null);
  const [otherPublicKey, setOtherPublicKey] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);

  const base64ToArrayBuffer = useCallback((base64: string): ArrayBuffer => {
    try {
      console.log('🔄 Convertendo base64 para ArrayBuffer, tamanho base64:', base64.length);
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      console.log('✅ ArrayBuffer convertido, tamanho:', bytes.length, 'bytes');
      return bytes.buffer;
    } catch (error) {
      console.error('❌ Erro na conversão base64:', error);
      throw error;
    }
  }, []);

  const loadKeys = useCallback(async () => {
    if (!conversaId) {
      console.log('⚠️ Nenhum conversaId fornecido para loadKeys');
      return;
    }

    console.log(`🔄 [loadKeys] Iniciando para conversa: ${conversaId}`);
    setLoading(true);
    
    try {
      // 1. Primeiro carregar chaves públicas do servidor
      console.log('📡 [loadKeys] Buscando chaves públicas do servidor...');
      const publicKeys = await getPublicKeys(conversaId);
      console.log('📦 [loadKeys] Resposta completa do servidor:', publicKeys);

      if (!publicKeys) {
        console.log('❌ [loadKeys] Nenhuma chave pública retornada do servidor');
        return;
      }

      // 2. Verificar estrutura da resposta
      if (!publicKeys.userPublicKey || !publicKeys.otherUserPublicKey) {
        console.log('❌ [loadKeys] Chaves públicas incompletas no servidor:', {
          temUserPublicKey: !!publicKeys.userPublicKey,
          temOtherUserPublicKey: !!publicKeys.otherUserPublicKey,
          respostaCompleta: publicKeys
        });
        return;
      }

      console.log('🔑 [loadKeys] Chaves públicas validadas:', {
        userPublicKeyLength: publicKeys.userPublicKey.length,
        otherUserPublicKeyLength: publicKeys.otherUserPublicKey.length
      });

      // 3. Converter chaves públicas de base64 para ArrayBuffer
      console.log('🔄 [loadKeys] Convertendo chaves públicas...');
      const myPublicKeyBuffer = base64ToArrayBuffer(publicKeys.userPublicKey);
      const otherPublicKeyBuffer = base64ToArrayBuffer(publicKeys.otherUserPublicKey);

      console.log('📊 [loadKeys] Buffers convertidos:', {
        myPublicKeyBuffer: myPublicKeyBuffer ? `✅ ${myPublicKeyBuffer.byteLength} bytes` : '❌',
        otherPublicKeyBuffer: otherPublicKeyBuffer ? `✅ ${otherPublicKeyBuffer.byteLength} bytes` : '❌'
      });

      // 4. ATUALIZAR ESTADO - Este é o ponto crítico
      console.log('🔄 [loadKeys] Atualizando estado das chaves públicas...');
      
      // Usar funções de atualização diretamente
      setMyPublicKey(myPublicKeyBuffer);
      setOtherPublicKey(otherPublicKeyBuffer);
      
      console.log('✅ [loadKeys] Estados atualizados no hook');

      // 5. Carregar chave privada
      console.log('🔐 [loadKeys] Buscando chave privada no IndexedDB...');
      const privateKeyBuffer = await recuperarChavePrivada(conversaId.toString(), "tokenFake");
      
      if (privateKeyBuffer) {
        console.log('✅ [loadKeys] Chave privada encontrada no IndexedDB');
        // Se precisar importar como CryptoKey, descomente:
        // const importedPrivateKey = await importPrivateKey(privateKeyBuffer);
        // setMyPrivateKey(importedPrivateKey);
        setMyPrivateKey(privateKeyBuffer as any); // Temporário para manter compatibilidade
      } else {
        console.log('⚠️ [loadKeys] Chave privada NÃO encontrada no IndexedDB');
        setMyPrivateKey(null);
      }

      // 6. Verificação imediata após setState
      console.log('📝 [loadKeys] Verificação pós-atualização:', {
        myPublicKeySet: !!myPublicKeyBuffer,
        otherPublicKeySet: !!otherPublicKeyBuffer,
        privateKeySet: !!privateKeyBuffer
      });

    } catch (error) {
      console.error('❌ [loadKeys] Erro durante carregamento:', error);
    } finally {
      setLoading(false);
      console.log('🏁 [loadKeys] Finalizado');
    }
  }, [conversaId, base64ToArrayBuffer]);

  // Efeito para carregar chaves automaticamente quando conversaId mudar
  useEffect(() => {
    console.log('🎯 [useEffect] conversaId alterado:', conversaId);
    
    // Limpar estado anterior
    setMyPrivateKey(null);
    setMyPublicKey(null);
    setOtherPublicKey(null);

    if (conversaId) {
      console.log('🚀 [useEffect] Executando loadKeys...');
      loadKeys();
    } else {
      console.log('⏹️ [useEffect] conversaId nulo, estado limpo');
    }
  }, [conversaId, loadKeys]);

  // Efeito para monitorar mudanças de estado
  useEffect(() => {
    console.log('📢 [ESTADO] Estado atualizado no hook:', {
      myPublicKey: myPublicKey ? `✅ ${myPublicKey.byteLength} bytes` : '❌ Nulo',
      otherPublicKey: otherPublicKey ? `✅ ${otherPublicKey.byteLength} bytes` : '❌ Nulo',
      myPrivateKey: myPrivateKey ? '✅ Presente' : '❌ Nulo',
      loading: loading ? '🔄 Carregando...' : '✅ Pronto'
    });
  }, [myPublicKey, otherPublicKey, myPrivateKey, loading]);

  const generateMyKeys = useCallback(async (chatId: number) => {
    if (!chatId) {
      console.log('⚠️ Nenhum chatId fornecido para generateMyKeys');
      return;
    }

    try {
      console.log(`🔄 [generateMyKeys] Gerando novas chaves para chat: ${chatId}`);
      
      const keyPair = await gerarChaves();
      const privateKeyBuffer = await exportPrivateKey(keyPair.privateKey);
      const publicKeyBuffer = await exportPublicKey(keyPair.publicKey);

      // Converter para base64 para enviar ao servidor
      const publicKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(publicKeyBuffer))
      );

      console.log('📡 [generateMyKeys] Registrando chave pública no servidor...');
      await registerPublicKey(publicKeyBase64, chatId);

      // Salvar chave privada localmente
      const expiresAt = Date.now() + 1000 * 60 * 60; // 2 minutos
      await salvarChavePrivada(chatId.toString(), privateKeyBuffer, "tokenFake", expiresAt);

      // Atualizar estado
      setMyPrivateKey(keyPair.privateKey);
      setMyPublicKey(publicKeyBuffer);
      
      console.log('✅ [generateMyKeys] Chaves geradas e salvas com sucesso');
      return publicKeyBuffer;
    } catch (error) {
      console.error(`❌ [generateMyKeys] Erro ao gerar chaves:`, error);
      throw error;
    }
  }, []);

  const setOtherUserPublicKey = useCallback(async (publicKeyBuffer: ArrayBuffer) => {
    if (!conversaId) {
      console.log('⚠️ Nenhum conversaId para setOtherUserPublicKey');
      return;
    }

    console.log('💾 [setOtherUserPublicKey] Salvando chave pública do outro usuário...');
    await saveItem("chatDB", "keys", `public_other_${conversaId}`, publicKeyBuffer);
    setOtherPublicKey(publicKeyBuffer);
    console.log('✅ [setOtherUserPublicKey] Chave pública do outro usuário salva');
  }, [conversaId]);

  const clearKeys = useCallback(() => {
    console.log('🗑️ [clearKeys] Limpando todas as chaves');
    setMyPrivateKey(null);
    setMyPublicKey(null);
    setOtherPublicKey(null);
  }, []);

  // Função para forçar recarregamento (útil para debug)
  const forceReload = useCallback(() => {
    console.log('🔧 [forceReload] Recarregamento forçado');
    if (conversaId) {
      loadKeys();
    }
  }, [conversaId, loadKeys]);

  return {
    myPrivateKey,
    myPublicKey,
    otherPublicKey,
    loading,
    loadKeys,
    generateMyKeys,
    setOtherUserPublicKey,
    clearKeys,
    forceReload, // Adicionado para debug
  };
}