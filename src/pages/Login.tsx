import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Lock, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      navigate('/admin');
    } catch (error) {
      setError('Email ou senha incorretos. Se você esqueceu sua senha, entre em contato com o administrador do sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-background text-white flex items-center justify-center p-4 safe-area-pb">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-yellow-500/20">
            <Scissors size={36} className="text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold text-yellow-500 mb-2 logo-text">Rafael Barbeiro</h1>
          <p className="text-gray-300">Área Administrativa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-black/50 backdrop-blur-sm p-6 rounded-lg shadow-xl border border-white/10">
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-md">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-gray-300 mb-2">
                <Mail size={20} className="text-yellow-500" />
                <span>Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors"
                required
                placeholder="admin@barbearia.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-300 mb-2">
                <Lock size={20} className="text-yellow-500" />
                <span>Senha</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors"
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-yellow-500 text-black py-3 rounded-md hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                <span>Entrando...</span>
              </>
            ) : (
              'Entrar'
            )}
          </button>

          <p className="text-sm text-gray-400 text-center mt-4">
            Credenciais padrão:<br />
            Email: admin@barbearia.com<br />
            Senha: admin123
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;