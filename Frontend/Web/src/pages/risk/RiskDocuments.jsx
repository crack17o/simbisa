import React, { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import { Upload, Trash2, FileText, Plus } from 'lucide-react'
import { listRagDocuments, uploadRagDocument, deleteRagDocument } from '@/api/rag'
import { formatDate } from '@/utils/formatters'

const DOC_TYPES = [
  { value: 'policy',    label: 'Politique interne' },
  { value: 'procedure', label: 'Procédure' },
  { value: 'guide',     label: 'Guide' },
  { value: 'other',     label: 'Autre' },
]

export default function RiskDocuments() {
  const [docs, setDocs]           = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [title, setTitle]         = useState('')
  const [docType, setDocType]     = useState('policy')
  const [source, setSource]       = useState('')
  const [content, setContent]     = useState('')
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(() => {
    listRagDocuments()
      .then(res => setDocs(res.data || []))
      .catch(err => toast.error(err.message))
  }, [])

  useEffect(() => { load() }, [load])

  const reset = () => {
    setTitle(''); setDocType('policy'); setSource(''); setContent(''); setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setShowForm(false)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Le titre est requis.'); return }
    if (!content.trim() && !file) { toast.error('Fournissez du texte ou un fichier PDF.'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('document_type', docType)
      if (source.trim()) fd.append('source', source.trim())
      if (file) fd.append('file', file)
      else fd.append('content', content.trim())
      await uploadRagDocument(fd)
      toast.success('Document indexé avec succès.')
      reset()
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer « ${doc.title} » ?`)) return
    setDeletingId(doc.id)
    try {
      await deleteRagDocument(doc.id)
      toast.success('Document supprimé.')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardLayout title="Documents de politique">
      <div className="flex flex-col gap-6 max-w-4xl">

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{docs.length} document(s) indexé(s) dans la base RAG</p>
          <Button icon={Plus} onClick={() => setShowForm(p => !p)}>
            {showForm ? 'Annuler' : 'Nouveau document'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleUpload} className="neu-flat p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-blanc">Ajouter un document</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-widest">Titre *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex : Politique crédit PME 2024"
                  className="neu-inset rounded-xl px-4 py-3 text-sm text-blanc placeholder-muted/50 outline-none bg-transparent"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-widest">Type</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="neu-inset rounded-xl px-4 py-3 text-sm text-blanc outline-none bg-surface"
                >
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-widest">Source (optionnel)</label>
              <input
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="Ex : Direction risque Rawbank, 2024"
                className="neu-inset rounded-xl px-4 py-3 text-sm text-blanc placeholder-muted/50 outline-none bg-transparent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-widest">
                Fichier PDF
              </label>
              <div
                className="neu-inset rounded-xl p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={16} className="text-muted flex-shrink-0" />
                <span className="text-sm text-muted">
                  {file ? file.name : 'Cliquez pour choisir un PDF…'}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-muted">ou collez le texte directement</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-widest">Contenu texte</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Collez ici le contenu du document…"
                rows={6}
                disabled={!!file}
                className="neu-inset rounded-xl px-4 py-3 text-sm text-blanc placeholder-muted/50 outline-none bg-transparent resize-none disabled:opacity-40"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={reset}>Annuler</Button>
              <Button type="submit" icon={Upload} loading={uploading}>Indexer le document</Button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-3">
          {docs.length === 0 && (
            <p className="text-sm text-muted neu-flat p-6 rounded-xl text-center">
              Aucun document indexé. Ajoutez des politiques internes pour enrichir le RAG.
            </p>
          )}
          {docs.map(doc => (
            <div key={doc.id} className="neu-flat p-5 flex items-start gap-4">
              <div className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center"
                style={{ background: '#D4AF3715' }}>
                <FileText size={18} style={{ color: '#D4AF37' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-blanc text-sm truncate">{doc.title}</p>
                  <Badge
                    label={DOC_TYPES.find(t => t.value === doc.document_type)?.label ?? doc.document_type}
                    variant="gold"
                  />
                  {doc.embedding ? (
                    <Badge label="Indexé" variant="success" />
                  ) : (
                    <Badge label="Sans embedding" variant="warning" />
                  )}
                </div>
                {doc.source && <p className="text-xs text-muted mt-0.5">Source : {doc.source}</p>}
                <p className="text-xs text-muted mt-1">
                  {doc.content?.length ?? 0} car. · ajouté le {formatDate(doc.created_at)}
                </p>
                <p className="text-xs text-muted/60 mt-1 line-clamp-2">{doc.content?.slice(0, 160)}…</p>
              </div>
              <Button
                size="sm"
                variant="danger"
                icon={Trash2}
                loading={deletingId === doc.id}
                onClick={() => handleDelete(doc)}
              />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
