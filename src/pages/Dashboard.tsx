import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Scissors, LogOut, Phone, Calendar, Clock, Trash2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import type { Appointment, User } from '../types';

interface DashboardProps {
  user: User;
}

function Dashboard({ user }: DashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          service:services(*)
        `);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filter === 'today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query = query
          .gte('appointment_date', today.toISOString())
          .lt('appointment_date', tomorrow.toISOString());
      } else if (filter === 'upcoming') {
        query = query.gte('appointment_date', today.toISOString());
      }

      query = query.order('appointment_date', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      await fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
      await fetchAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  return (
    <div className="min-h-screen app-background text-white">
      <div className="max-w-6xl mx-auto p-4">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 -ml-2 text-gray-400 hover:text-yellow-500 transition-colors"
              title="Voltar"
            >
              <ArrowLeft size={24} />
            </Link>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 backdrop-blur-sm flex items-center justify-center border border-yellow-500/20">
              <Scissors size={24} className="text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-yellow-500 logo-text">Painel Administrativo</h1>
              <p className="text-gray-400 text-sm">Bem-vindo, {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'today' | 'upcoming')}
              className="flex-1 sm:flex-none px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors"
            >
              <option value="all">Todos os agendamentos</option>
              <option value="today">Hoje</option>
              <option value="upcoming">Próximos</option>
            </select>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        <div className="bg-black/50 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Agendamentos</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-500"></div>
              </div>
            ) : appointments.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhum agendamento encontrado</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-black/30 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold">{appointment.client_name}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(
                          appointment.status || 'confirmed'
                        )}`}
                      >
                        {appointment.status === 'cancelled' ? 'Cancelado' : 'Confirmado'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-yellow-500" />
                        <span>{appointment.phone_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-yellow-500" />
                        <span>
                          {format(new Date(appointment.appointment_date), "dd 'de' MMMM", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-yellow-500" />
                        <span>{format(new Date(appointment.appointment_date), 'HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scissors size={16} className="text-yellow-500" />
                        <span>{appointment.service?.name}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-end gap-2">
                      {appointment.status !== 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                          className="p-2 text-green-500 hover:bg-green-500/10 rounded-full transition-colors"
                          title="Confirmar"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {appointment.status !== 'cancelled' && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                          title="Cancelar"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAppointment(appointment.id)}
                        className="p-2 text-gray-400 hover:bg-gray-700 rounded-full transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;