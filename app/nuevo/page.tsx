"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Upload, X, FileText } from "lucide-react"

export default function NuevoPresupuesto() {
  const [titulo, setTitulo] = useState("")
  const [detalles, setDetalles] = useState("")
  const [fechaLimite, setFechaLimite] = useState("")
  const [archivos, setArchivos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files)
      setArchivos((prev) => [...prev, ...nuevosArchivos])
    }
  }

  const removeFile = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Crear el presupuesto
      const { data: presupuesto, error: presupuestoError } = await supabase
        .from("presupuestos")
        .insert({
          titulo,
          detalles,
          fecha_limite: fechaLimite,
        })
        .select()
        .single()

      if (presupuestoError) throw presupuestoError

      // Subir archivos si los hay
      if (archivos.length > 0) {
        for (const archivo of archivos) {
          const fileName = `${presupuesto.id}/${Date.now()}-${archivo.name}`

          const { error: uploadError } = await supabase.storage.from("presupuestos-archivos").upload(fileName, archivo)

          if (uploadError) throw uploadError

          // Guardar información del archivo en la base de datos
          const { error: archivoError } = await supabase.from("archivos_adjuntos").insert({
            presupuesto_id: presupuesto.id,
            nombre_archivo: archivo.name,
            ruta_archivo: fileName,
            tipo_archivo: archivo.type,
            tamaño_archivo: archivo.size,
          })

          if (archivoError) throw archivoError
        }
      }

      toast({
        title: "Presupuesto creado",
        description: "El presupuesto se ha guardado correctamente.",
      })

      router.push("/presupuestos")
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el presupuesto.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Presupuesto</CardTitle>
          <CardDescription>Crea un nuevo presupuesto con todos los detalles necesarios</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ingresa el título del presupuesto"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detalles">Detalles</Label>
              <Textarea
                id="detalles"
                value={detalles}
                onChange={(e) => setDetalles(e.target.value)}
                placeholder="Describe los detalles del presupuesto..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-limite">Fecha Límite *</Label>
              <Input
                id="fecha-limite"
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="archivos">Archivos Adjuntos</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="archivos" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">Seleccionar archivos</span>
                      <span className="mt-1 block text-xs text-gray-500">PDF, Word, Excel y otros formatos</span>
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

              {archivos.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Archivos seleccionados:</Label>
                  {archivos.map((archivo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{archivo.name}</span>
                        <span className="text-xs text-gray-500">({(archivo.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Presupuesto"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
