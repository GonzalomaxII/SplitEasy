import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, ArrowRight, Trash2, FolderPlus, X, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado del modal de creación
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchGroups = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await api.get('/groups');
      setGroups(data);
      setError('');
    } catch (err) {
      if (!silent) {
        setError('No se pudieron cargar tus grupos. Verificá la conexión con el servidor.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(false);

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchGroups(true);
      }
    }, 12000);

    const handleFocus = () => fetchGroups(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setModalError('');
    setCreating(true);

    try {
      const { data } = await api.post('/groups', { name, description });
      setGroups((prev) => [data, ...prev]);
      setName('');
      setDescription('');
      setShowModal(false);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error al crear el grupo.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    const confirmed = window.confirm(
      `¿Seguro que querés eliminar el grupo "${groupName}"? Se borrarán todos sus gastos y pagos asociados.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/groups/${groupId}`);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar el grupo.');
    }
  };

  return (
    <div>
      <Navbar />

      <main className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Mis Grupos</h1>
            <p className="page-subtitle">
              Seleccioná un grupo para ver balances, cargar gastos o saldar cuentas
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            <span>Nuevo grupo</span>
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            Cargando tus grupos...
          </div>
        ) : groups.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <FolderPlus size={28} />
            </div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Todavía no tenés grupos</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 22px' }}>
              Creá tu primer grupo para un viaje, salida con amigos o gastos del departamento e invitá a otros integrantes.
            </p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              <span>Crear mi primer grupo</span>
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => {
              const isOwner = group.createdById === user?.userId;
              return (
                <div key={group.id} className="card group-card">
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{group.name}</h3>
                      <span className="badge badge-neutral">
                        <Users size={13} />
                        {group.members?.length || 1}
                      </span>
                    </div>

                    <p
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        marginBottom: 16,
                        minHeight: 40,
                      }}
                    >
                      {group.description || 'Sin descripción adicional'}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 14,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {isOwner ? 'Creado por vos' : `Admin: ${group.createdByName}`}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          className="btn btn-ghost-danger"
                          title="Eliminar grupo"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <Link
                        to={`/groups/${group.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        <span>Entrar</span>
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Nuevo Grupo */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Crear nuevo grupo</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label className="form-label" htmlFor="groupName">
                  Nombre del grupo *
                </label>
                <input
                  id="groupName"
                  type="text"
                  className="form-input"
                  placeholder="Ej. Viaje a Bariloche, Depto 4B..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="groupDesc">
                  Descripción (opcional)
                </label>
                <input
                  id="groupDesc"
                  type="text"
                  className="form-input"
                  placeholder="Ej. Gastos compartidos de comida, cabaña y nafta"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creando...' : 'Crear grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}