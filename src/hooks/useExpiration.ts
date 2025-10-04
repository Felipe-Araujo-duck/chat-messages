import { useState, useEffect, useCallback } from 'react';

export function useExpiration(initialExpired: boolean, conversaId: number | null) {
  const [expirou, setExpirou] = useState(initialExpired);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // Resetar expiração quando a conversa mudar
  useEffect(() => {
    setExpirou(initialExpired);
    setExpiresAt(null);
  }, [conversaId, initialExpired]);

  // Verificar expiração automaticamente
  useEffect(() => {
    if (!expiresAt) return;
    console.log(expiresAt)
    const checkExpiration = () => {
      const now = Date.now();
      if (now >= expiresAt) {
        setExpirou(true);
      }
    };

    // Verificar imediatamente
    checkExpiration();

    // Verificar a cada segundo
    const interval = setInterval(checkExpiration, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const renovarExpiracao = useCallback((minutos: number = 2) => {
    const novaExpiração = Date.now() + (minutos * 60 * 1000);
    setExpiresAt(novaExpiração);
    setExpirou(false);
    return novaExpiração;
  }, []);

  const forcarExpiração = useCallback(() => {
    setExpirou(true);
    setExpiresAt(null);
  }, []);

  return {
    expirou,
    expiresAt,
    renovarExpiracao,
    forcarExpiração,
  };
}