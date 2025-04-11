import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Scissors, User, Phone, LogIn, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, addMinutes, startOfToday, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabase';
import type { Service, Appointment } from '../types';

function Booking() {
  const [clientName, setClientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'afternoon'>('morning');
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
    
    const setAppHeight = () => {
      document.documentElement.style.setProperty(
        '--app-height',
        `${window.innerHeight}px`
      );
    };
    
    window.addEventListener('resize', setAppHeight);
    setAppHeight();
    
    return () => window.removeEventListener('resize', setAppHeight);
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*');
    if (data) {
      const parsedServices = data.map(service => ({
        ...service,
        price: typeof service.price === 'string' ? parseFloat(service.price) : service.price
      }));
      setServices(parsedServices);
    }
  };

  const fetchAppointments = async () => {
    setLoadingTimeSlots(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', startOfDay.toISOString())
        .order('appointment_date', { ascending: true });
      
      if (error) throw error;
      
      const parsedAppointments = data.map(apt => ({
        ...apt,
        date: parseISO(apt.appointment_date)
      }));
      
      setAppointments(parsedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const isTimeSlotAvailable = (dateTime: Date) => {
    if (!selectedService) return false;

    if (isBefore(dateTime, new Date())) {
      return false;
    }

    const hour = dateTime.getHours();
    if (selectedPeriod === 'morning' && (hour < 8 || hour >= 12)) {
      return false;
    }
    if (selectedPeriod === 'afternoon' && (hour < 14 || hour >= 18)) {
      return false;
    }

    const slotEnd = addMinutes(dateTime, selectedService.duration);
    
    return !appointments.some(apt => {
      const appointmentStart = new Date(apt.date);
      const appointmentEnd = addMinutes(appointmentStart, selectedService.duration);

      return (
        (dateTime >= appointmentStart && dateTime < appointmentEnd) ||
        (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
        (dateTime <= appointmentStart && slotEnd >= appointmentEnd)
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !phoneNumber || !selectedService || !selectedDate) return;

    if (!isTimeSlotAvailable(selectedDate)) {
      alert('Este horário não está mais disponível. Por favor, escolha outro horário.');
      fetchAppointments();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        client_name: clientName,
        phone_number: phoneNumber,
        service_id: selectedService.id,
        appointment_date: selectedDate.toISOString()
      });

      if (error) throw error;

      const message = `Olá! Gostaria de agendar um horário:\n\nNome: ${clientName}\nTelefone: ${phoneNumber}\nServiço: ${selectedService.name}\nData: ${format(selectedDate, 'dd/MM/yyyy')}\nHorário: ${format(selectedDate, 'HH:mm')}`;
      const whatsappUrl = `https://wa.me/5585994015283?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      setClientName('');
      setPhoneNumber('');
      setSelectedService(null);
      setSelectedDate(null);
      await fetchAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Erro ao criar agendamento. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getTimeSlots = () => {
    if (!selectedDate || !selectedService) return [];
    
    const slots = [];
    let startHour, endHour;
    
    switch (selectedPeriod) {
      case 'morning':
        startHour = 8;
        endHour = 12;
        break;
      case 'afternoon':
        startHour = 14;
        endHour = 18;
        break;
      default:
        return [];
    }

    let currentTime = new Date(selectedDate);
    currentTime.setHours(startHour, 0, 0, 0);
    const endTime = new Date(selectedDate);
    endTime.setHours(endHour, 0, 0, 0);

    if (format(currentTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
      const now = new Date();
      if (now > currentTime) {
        currentTime = new Date(now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30));
      }
    }

    while (currentTime < endTime) {
      if (isTimeSlotAvailable(currentTime)) {
        slots.push(new Date(currentTime));
      }
      currentTime = addMinutes(currentTime, 30);
    }

    return slots;
  };

  return (
    <div className="min-h-screen app-background text-white landscape-scroll">
      <div className="max-w-md mx-auto p-4 sm:p-6 safe-area-pb">
        <div className="text-center mb-6 sm:mb-8 relative">
          <Link
            to="/login"
            className="absolute right-0 top-0 p-2 text-gray-400 hover:text-yellow-500 transition-colors"
            title="Área do Barbeiro"
          >
            <LogIn size={24} />
          </Link>
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-yellow-500/20">
            <Scissors size={36} className="text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold text-yellow-500 mb-2 logo-text">Rafael Barbeiro</h1>
          <p className="text-gray-300">Estilo e Precisão</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-black/50 backdrop-blur-sm p-6 rounded-lg shadow-xl border border-white/10">
          <div>
            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm sm:text-base">
              <User size={18} className="text-yellow-500" />
              <span>Nome</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 sm:p-3 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors"
              required
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm sm:text-base">
              <Phone size={18} className="text-yellow-500" />
              <span>Telefone</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(85) 99999-9999"
              className="w-full px-3 py-2 sm:p-3 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors"
              required
              pattern="\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm sm:text-base">
              <Scissors size={18} className="text-yellow-500" />
              <span>Serviço</span>
            </label>
            <select
              value={selectedService?.id || ''}
              onChange={(e) => {
                setSelectedService(services.find(s => s.id === e.target.value) || null);
                setSelectedDate(null);
              }}
              className="w-full px-3 py-2 sm:p-3 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors appearance-none"
              required
            >
              <option value="">Selecione um serviço</option>
              {services.map(service => {
                const price = typeof service.price === 'string' ? parseFloat(service.price) : service.price;
                return (
                  <option key={service.id} value={service.id}>
                    {service.name} - R$ {price.toFixed(2)}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm sm:text-base">
              <Calendar size={18} className="text-yellow-500" />
              <span>Data e Horário</span>
            </label>
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="w-full px-3 py-2 sm:p-3 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors text-left"
            >
              {selectedDate 
                ? `${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às ${format(selectedDate, 'HH:mm')}`
                : "Selecione a data e horário"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !clientName || !phoneNumber || !selectedService || !selectedDate}
            className="w-full bg-yellow-500 text-black py-3 rounded-md hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors font-semibold mt-6"
          >
            {loading ? 'Agendando...' : 'Agendar Horário'}
          </button>
        </form>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="date-picker-modal">
          <div className="date-picker-header">
            <h2 className="text-xl font-semibold">Data do agendamento</h2>
            <button
              onClick={() => setShowDatePicker(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="date-picker-content">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                if (date) {
                  const hour = date.getHours();
                  setSelectedPeriod(hour < 12 ? 'morning' : 'afternoon');
                }
              }}
              inline
              locale={ptBR}
              minDate={startOfToday()}
              filterDate={(date) => {
                const day = date.getDay();
                return day !== 0;
              }}
            />

            <h3 className="text-xl font-semibold mt-8 mb-4">Escolha o melhor horário</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setSelectedPeriod('morning')}
                className={`time-period-button ${selectedPeriod === 'morning' ? 'selected' : ''}`}
              >
                Manhã
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('afternoon')}
                className={`time-period-button ${selectedPeriod === 'afternoon' ? 'selected' : ''}`}
              >
                Tarde
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {loadingTimeSlots ? (
                <div className="col-span-3 flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-yellow-500"></div>
                </div>
              ) : getTimeSlots().length > 0 ? (
                getTimeSlots().map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const newDate = new Date(selectedDate!);
                      newDate.setHours(slot.getHours(), slot.getMinutes());
                      setSelectedDate(newDate);
                    }}
                    className={`time-slot-button ${
                      selectedDate?.getTime() === slot.getTime() ? 'selected' : ''
                    }`}
                  >
                    {format(slot, 'HH:mm')}
                  </button>
                ))
              ) : (
                <p className="col-span-3 text-center text-gray-400 py-4">
                  Nenhum horário disponível neste período
                </p>
              )}
            </div>
          </div>

          <div className="date-picker-footer">
            <button
              type="button"
              onClick={() => setShowDatePicker(false)}
              className="w-full bg-white text-black py-3 rounded-xl font-semibold"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Booking;