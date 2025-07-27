"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase, type Presupuesto, type ArchivoAdjunto } from "@/lib/supabase"
import { Upload, X, FileText, Download, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function EditarPresupuesto({ params }: { params: { id: string } }) {
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [archivosExistentes, setArchivosExistentes] = useState<ArchivoAdjunto[]>([])
  const [nuevosArchivos, setNuevosArchivos] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    cargarPresupuesto()
  }, [params.id])

  const cargarPresupuesto = async () => {
    try {
      // Cargar presupuesto
      const { data: presupuestoData, error: presupuestoError } = await supabase
        .from("presupuestos")
        .select("*")
        .eq("id", params.id)
        .single()

      if (presupuestoError) throw presupuestoError
      setPresupuesto(presupuestoData)

      // Cargar archivos adjuntos
      const { data: archivosData, error: archivosError } = await supabase
        .from("archivos_adjuntos")
        .select("*")
        .eq("presupuesto_id", params.id)

      if (archivosError) throw archivosError
      setArchivosExistentes(archivosData || [])
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el presupuesto.",
        variant: "destructive",
      })
      router.push("/presupuestos")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const archivos = Array.from(e.target.files)
      setNuevosArchivos((prev) => [...prev, ...archivos])
    }
  }

  const removeNewFile = (index: number) => {
    setNuevosArchivos((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingFile = async (archivo: ArchivoAdjunto) => {
    try {
      // Eliminar del storage
      await supabase.storage.from("presupuestos-archivos").remove([archivo.ruta_archivo])

      // Eliminar de la base de datos
      const { error } = await supabase.from("archivos_adjuntos").delete().eq("id", archivo.id)

      if (error) throw error

      setArchivosExistentes((prev) => prev.filter((a) => a.id !== archivo.id))
      toast({
        title: "Archivo eliminado",
        description: "El archivo se ha eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo.",
        variant: "destructive",
      })
    }
  }

  const downloadFile = async (archivo: ArchivoAdjunto) => {
    try {
      const { data, error } = await supabase.storage.from("presupuestos-archivos").download(archivo.ruta_archivo)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = archivo.nombre_archivo
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!presupuesto) return

    setSaving(true)

    try {
      // Actualizar presupuesto
      const { error: updateError } = await supabase
        .from("presupuestos")
        .update({
          titulo: presupuesto.titulo,
          detalles: presupuesto.detalles,
          fecha_limite: presupuesto.fecha_limite,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (updateError) throw updateError

      // Subir nuevos archivos
      if (nuevosArchivos.length > 0) {
        for (const archivo of nuevosArchivos) {
          const fileName = `${params.id}/${Date.now()}-${archivo.name}`

          const { error: uploadError } = await supabase.storage.from("presupuestos-archivos").upload(fileName, archivo)

          if (uploadError) throw uploadError

          const { error: archivoError } = await supabase.from("archivos_adjuntos").insert({
            presupuesto_id: params.id,
            nombre_archivo: archivo.name,
            ruta_archivo: fileName,
            tipo_archivo: archivo.type,
            tamaño_archivo: archivo.size,
          })

          if (archivoError) throw archivoError
        }
      }

      toast({
        title: "Presupuesto actualizado",
        description: "Los cambios se han guardado correctamente.",
      })

      router.push("/presupuestos")
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !presupuesto) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/presupuestos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Presupuestos
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Presupuesto</CardTitle>
          <CardDescription>Modifica los detalles del presupuesto</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={presupuesto.titulo}
                onChange={(e) => setPresupuesto((prev) => (prev ? { ...prev, titulo: e.target.value } : null))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detalles">Detalles</Label>
              <Textarea
                id="detalles"
                value={presupuesto.detalles || ""}
                onChange={(e) => setPresupuesto((prev) => (prev ? { ...prev, detalles: e.target.value } : null))}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-limite">Fecha Límite *</Label>
              <Input
                id="fecha-limite"
                type="date"
                value={presupuesto.fecha_limite}
                onChange={(e) => setPresupuesto((prev) => (prev ? { ...prev, fecha_limite: e.target.value } : null))}
                required
              />
            </div>

            {/* Archivos existentes */}
            {archivosExistentes.length > 0 && (
              <div className="space-y-2">
                <Label>Archivos actuales</Label>
                <div className="space-y-2">
                  {archivosExistentes.map((archivo) => (
                    <div key={archivo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{archivo.nombre_archivo}</span>
                        <span className="text-xs text-gray-500">
                          ({(archivo.tamaño_archivo / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => downloadFile(archivo)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeExistingFile(archivo)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nuevos archivos */}
            <div className="space-y-2">
              <Label htmlFor="archivos">Agregar nuevos archivos</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="archivos" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">Seleccionar archivos</span>
                    </Label>
                    <Input
                      id="archivos"
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    />
                  </div>
                </div>
              </div>

              {nuevosArchivos.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Nuevos archivos:</Label>
                  {nuevosArchivos.map((archivo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{archivo.name}</span>
                        <span className="text-xs text-gray-500">({(archivo.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeNewFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/presupuestos">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
