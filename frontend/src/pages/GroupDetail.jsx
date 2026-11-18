import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  UserPlus,
  CreditCard,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Scale,
  ArrowRight,
  Users,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const CATEGORIES = [
  'Comida',
  'Transporte',
  'Alojamiento',
  'Supermercado',
  'Entretenimiento',
  'Servicios',
  'Otros',
];

const getTodayISO = () => new Date().toISOString().split('T')[0];

const formatMoney = (value) => {
  const num = Number(value || 0);
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [summary, setSummary] = useState({ balances: [], simplifiedDebts: [] });
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [activeTab, setActiveTab] = useState('expenses');

  // Modal Agregar Miembro
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Modal Gasto (Crear / Editar)
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Comida');
  const [expDate, setExpDate] = useState(getTodayISO());
  const [expPaidById, setExpPaidById] = useState('');
  const [expSplits, setExpSplits] = useState({});
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState('');

  // Modal Registrar Pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payFromId, setPayFromId] = useState('');
  const [payToId, setPayToId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(getTodayISO());
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const loadAllData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [groupRes, summaryRes, expensesRes, paymentsRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/groups/${groupId}/summary`),
        api.get(`/groups/${groupId}/expenses`),
        api.get(`/groups/${groupId}/payments`),
      ]);
      setGroup(groupRes.data);
      setSummary(summaryRes.data);
      setExpenses(expensesRes.data);
      setPayments(paymentsRes.data);
      setPageError('');
    } catch (err) {
      if (!silent) {
        setPageError(
          err.response?.data?.message ||
            'No tenés acceso a este grupo o el grupo no existe.'
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadAllData(false);

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        loadAllData(true);
      }
    }, 12000);

    const handleFocus = () => loadAllData(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadAllData]);

  // --- Acciones de Grupo y Miembros ---
  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    setMemberLoading(true);
    try {
      await api.post(`/groups/${groupId}/members`, { email: memberEmail });
      setMemberEmail('');
      setShowMemberModal(false);
      await loadAllData(true);
    } catch (err) {
      setMemberError(err.response?.data?.message || 'No se pudo agregar al integrante.');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    const confirmed = window.confirm(
      `¿Seguro que querés eliminar el grupo "${group.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/groups/${groupId}`);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar el grupo.');
    }
  };

  // --- Lógica de Modal de Gasto ---
  const openCreateExpenseModal = () => {
    setEditingExpenseId(null);
    setExpDescription('');
    setExpAmount('');
    setExpCategory('Comida');
    setExpDate(getTodayISO());
    setExpPaidById(String(user?.userId || group.members[0]?.userId || ''));
    const initialSplits = {};
    group.members.forEach((m) => {
      initialSplits[m.userId] = '0';
    });
    setExpSplits(initialSplits);
    setExpError('');
    setShowExpenseModal(true);
  };

  const openEditExpenseModal = (expense) => {
    setEditingExpenseId(expense.id);
    setExpDescription(expense.description);
    setExpAmount(String(expense.amount));
    setExpCategory(expense.category);
    setExpDate(expense.expenseDate);
    setExpPaidById(String(expense.paidById));

    const mappedSplits = {};
    group.members.forEach((m) => {
      const existing = expense.splits.find((s) => s.userId === m.userId);
      mappedSplits[m.userId] = existing ? String(existing.amountOwed) : '0';
    });
    setExpSplits(mappedSplits);
    setExpError('');
    setShowExpenseModal(true);
  };

  const handleSplitEqually = () => {
    const total = parseFloat(expAmount);
    if (isNaN(total) || total <= 0 || !group?.members?.length) return;

    const totalCents = Math.round(total * 100);
    const count = group.members.length;
    const baseCents = Math.floor(totalCents / count);
    const remainder = totalCents % count;

    const updatedSplits = {};
    group.members.forEach((m, index) => {
      const memberCents = baseCents + (index < remainder ? 1 : 0);
      updatedSplits[m.userId] = (memberCents / 100).toFixed(2);
    });
    setExpSplits(updatedSplits);
  };

  const totalAmountCents = Math.round((parseFloat(expAmount) || 0) * 100);
  const splitsSumCents = Object.values(expSplits).reduce(
    (acc, val) => acc + Math.round((parseFloat(val) || 0) * 100),
    0
  );
  const diffCents = totalAmountCents - splitsSumCents;
  const isSplitBalanced = totalAmountCents > 0 && diffCents === 0;

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setExpError('');

    if (!isSplitBalanced) {
      setExpError('La suma de las divisiones debe coincidir exactamente con el monto total.');
      return;
    }

    const payload = {
      paidById: Number(expPaidById),
      amount: Number(parseFloat(expAmount).toFixed(2)),
      description: expDescription,
      category: expCategory,
      expenseDate: expDate,
      splits: group.members.map((m) => ({
        userId: m.userId,
        amountOwed: Number(parseFloat(expSplits[m.userId] || 0).toFixed(2)),
      })),
    };

    setExpLoading(true);
    try {
      if (editingExpenseId) {
        await api.put(`/groups/${groupId}/expenses/${editingExpenseId}`, payload);
      } else {
        await api.post(`/groups/${groupId}/expenses`, payload);
      }
      setShowExpenseModal(false);
      await loadAllData(true);
    } catch (err) {
      setExpError(err.response?.data?.message || 'Error al guardar el gasto.');
    } finally {
      setExpLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId, description) => {
    const confirmed = window.confirm(`¿Eliminar el gasto "${description}"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
      await loadAllData(true);
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar el gasto.');
    }
  };

  // --- Lógica de Modal de Pagos ---
  const openPaymentModal = (presetFrom = '', presetTo = '', presetAmount = '') => {
    const defaultFrom = presetFrom || String(user?.userId || group.members[0]?.userId || '');
    const otherMember = group.members.find((m) => String(m.userId) !== String(defaultFrom));
    setPayFromId(String(defaultFrom));
    setPayToId(presetTo ? String(presetTo) : String(otherMember?.userId || ''));
    setPayAmount(presetAmount ? String(presetAmount) : '');
    setPayDate(getTodayISO());
    setPayError('');
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    setPayError('');
    setPayLoading(true);

    try {
      await api.post(`/groups/${groupId}/payments`, {
        fromUserId: Number(payFromId),
        toUserId: Number(payToId),
        amount: Number(parseFloat(payAmount).toFixed(2)),
        paymentDate: payDate,
      });
      setShowPaymentModal(false);
      setActiveTab('payments');
      await loadAllData(true);
    } catch (err) {
      setPayError(err.response?.data?.message || 'Error al registrar el pago.');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <main className="container">
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            Cargando información del grupo...
          </div>
        </main>
      </div>
    );
  }

  if (pageError || !group) {
    return (
      <div>
        <Navbar />
        <main className="container">
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{pageError}</span>
          </div>
          <Link to="/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={16} />
            <span>Volver a mis grupos</span>
          </Link>
        </main>
      </div>
    );
  }

  const isGroupOwner = group.createdById === user?.userId;

  return (
    <div>
      <Navbar />

      <main className="container">
        {/* Encabezado del Grupo */}
        <div style={{ marginBottom: 14 }}>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
            }}
          >
            <ArrowLeft size={16} />
            <span>Volver a Mis Grupos</span>
          </Link>
        </div>

        <div className="page-header">
          <div>
            <h1 className="page-title">{group.name}</h1>
            {group.description && <p className="page-subtitle">{group.description}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {group.members.map((m) => (
                <span key={m.userId} className="badge badge-neutral">
                  <Users size={12} />
                  {m.name} {m.userId === user?.userId ? '(Vos)' : ''}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button className="btn btn-primary" onClick={openCreateExpenseModal}>
              <Plus size={18} />
              <span>Nuevo gasto</span>
            </button>
            <button className="btn btn-secondary" onClick={() => openPaymentModal()}>
              <CreditCard size={17} />
              <span>Registrar pago</span>
            </button>
            <button className="btn btn-secondary" onClick={() => setShowMemberModal(true)}>
              <UserPlus size={17} />
              <span>Agregar miembro</span>
            </button>
            {isGroupOwner && (
              <button
                className="btn btn-ghost-danger"
                onClick={handleDeleteGroup}
                title="Eliminar grupo"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Contenido Principal en 2 Columnas */}
        <div className="detail-grid">
          {/* Columna Izquierda: Historial de Gastos y Pagos */}
          <div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 16,
                borderBottom: '1px solid var(--border)',
                paddingBottom: 10,
              }}
            >
              <button
                className={`btn btn-sm ${activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('expenses')}
              >
                Gastos ({expenses.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'payments' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('payments')}
              >
                Pagos realizados ({payments.length})
              </button>
            </div>

            {activeTab === 'expenses' ? (
              expenses.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>
                    Aún no hay gastos registrados en este grupo.
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={openCreateExpenseModal}>
                    <Plus size={16} />
                    <span>Cargar el primer gasto</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {expenses.map((exp) => {
                    const isAuthor = exp.createdById === user?.userId;
                    const activeSplits = exp.splits.filter((s) => Number(s.amountOwed) > 0);

                    return (
                      <div key={exp.id} className="card" style={{ padding: 18 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{exp.description}</h3>
                              <span className="badge badge-category">
                                <Tag size={11} />
                                {exp.category}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              Pagó <strong>{exp.paidByName}</strong> •{' '}
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={13} />
                                {formatDate(exp.expenseDate)}
                              </span>
                            </p>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              ${formatMoney(exp.amount)}
                            </div>
                            {isAuthor && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                                <button
                                  className="btn btn-ghost"
                                  onClick={() => openEditExpenseModal(exp)}
                                  title="Editar gasto"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  className="btn btn-ghost-danger"
                                  onClick={() => handleDeleteExpense(exp.id, exp.description)}
                                  title="Eliminar gasto"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Desglose por persona */}
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop: '1px dashed var(--border)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {activeSplits.map((s) => (
                            <span
                              key={s.userId}
                              style={{
                                backgroundColor: 'var(--bg-subtle)',
                                padding: '2px 8px',
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                              }}
                            >
                              {s.userName}: <strong>${formatMoney(s.amountOwed)}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : payments.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                No se registraron transferencias entre integrantes todavía.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {payments.map((pay) => (
                  <div
                    key={pay.id}
                    className="card"
                    style={{
                      padding: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.95rem' }}>
                        <strong>{pay.fromUserName}</strong> le pagó a <strong>{pay.toUserName}</strong>
                      </p>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Fecha: {formatDate(pay.paymentDate)}
                      </span>
                    </div>
                    <span className="badge balance-positive" style={{ fontSize: '0.95rem', padding: '5px 12px' }}>
                      ${formatMoney(pay.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha: Deudas Simplificadas y Balances Netos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Tarjeta de Deudas Simplificadas */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Scale size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Cómo saldar deudas</h2>
              </div>

              {summary.simplifiedDebts.length === 0 ? (
                <div className="alert alert-success" style={{ marginBottom: 0 }}>
                  <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>¡Están todos al día! No hay deudas pendientes en el grupo.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {summary.simplifiedDebts.map((debt, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: '0.88rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <strong>{debt.fromUserName}</strong>
                          <ArrowRight size={14} color="var(--text-muted)" />
                          <strong>{debt.toUserName}</strong>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1rem', marginTop: 2 }}>
                          ${formatMoney(debt.amount)}
                        </div>
                      </div>

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openPaymentModal(debt.fromUserId, debt.toUserId, debt.amount)}
                      >
                        Saldar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tarjeta de Balance Neto por Integrante */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>
                Balance neto por integrante
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {summary.balances.map((b) => {
                  const net = Number(b.netBalance);
                  const badgeClass =
                    net > 0 ? 'balance-positive' : net < 0 ? 'balance-negative' : 'balance-zero';

                  return (
                    <div
                      key={b.userId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: 10,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{b.userName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Pagó ${formatMoney(b.totalPaid)} • Consumió ${formatMoney(b.totalConsumed)}
                        </div>
                      </div>

                      <span className={`badge ${badgeClass}`} style={{ fontSize: '0.85rem' }}>
                        {net > 0 ? `+$${formatMoney(net)}` : net < 0 ? `-$${formatMoney(Math.abs(net))}` : '$0,00'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: Crear / Editar Gasto */}
      {showExpenseModal && (
        <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingExpenseId ? 'Editar gasto' : 'Registrar nuevo gasto'}
              </h2>
              <button className="btn btn-ghost" onClick={() => setShowExpenseModal(false)}>
                <X size={20} />
              </button>
            </div>

            {expError && (
              <div className="alert alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{expError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense}>
              <div className="form-group">
                <label className="form-label">Descripción *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Supermercado, Cena, Peajes..."
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Monto total ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <select
                    className="form-select"
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">¿Quién pagó? *</label>
                  <select
                    className="form-select"
                    value={expPaidById}
                    onChange={(e) => setExpPaidById(e.target.value)}
                    required
                  >
                    {group.members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sección de División Personalizada */}
              <div
                style={{
                  marginTop: 8,
                  padding: 14,
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    ¿Cuánto consumió cada uno?
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSplitEqually}
                    disabled={!expAmount || Number(expAmount) <= 0}
                  >
                    Repartir en partes iguales
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.members.map((m) => (
                    <div
                      key={m.userId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>{m.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        style={{ width: 130, textAlign: 'right', padding: '7px 10px' }}
                        value={expSplits[m.userId] ?? '0'}
                        onChange={(e) =>
                          setExpSplits((prev) => ({
                            ...prev,
                            [m.userId]: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  ))}
                </div>

                {/* Indicador en vivo de cuadre contable */}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: isSplitBalanced ? 'var(--primary)' : 'var(--danger)',
                  }}
                >
                  <span>Asignado: ${formatMoney(splitsSumCents / 100)}</span>
                  <span>
                    {totalAmountCents <= 0
                      ? 'Ingresá un monto total'
                      : diffCents === 0
                      ? '¡Cuadra perfecto!'
                      : diffCents > 0
                      ? `Falta asignar: $${formatMoney(diffCents / 100)}`
                      : `Sobra: $${formatMoney(Math.abs(diffCents) / 100)}`}
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowExpenseModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={expLoading || !isSplitBalanced}
                >
                  {expLoading ? 'Guardando...' : editingExpenseId ? 'Guardar cambios' : 'Registrar gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Registrar Pago */}
      {showPaymentModal && (
        <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Registrar pago / transferencia</h2>
              <button className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>
                <X size={20} />
              </button>
            </div>

            {payError && (
              <div className="alert alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handleSavePayment}>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">¿Quién pagó? *</label>
                  <select
                    className="form-select"
                    value={payFromId}
                    onChange={(e) => setPayFromId(e.target.value)}
                    required
                  >
                    {group.members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">¿A quién le pagó? *</label>
                  <select
                    className="form-select"
                    value={payToId}
                    onChange={(e) => setPayToId(e.target.value)}
                    required
                  >
                    {group.members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Monto transferido ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha del pago *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={payLoading}>
                  {payLoading ? 'Registrando...' : 'Confirmar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Agregar Miembro */}
      {showMemberModal && (
        <div className="modal-backdrop" onClick={() => setShowMemberModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Agregar integrante al grupo</h2>
              <button className="btn btn-ghost" onClick={() => setShowMemberModal(false)}>
                <X size={20} />
              </button>
            </div>

            {memberError && (
              <div className="alert alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{memberError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">Correo electrónico del usuario *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="amigo@email.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  required
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  La persona ya debe tener una cuenta creada en SplitEasy con ese correo.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMemberModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={memberLoading}>
                  {memberLoading ? 'Agregando...' : 'Agregar al grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}