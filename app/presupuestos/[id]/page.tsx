"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase, type Presupuesto, type ArchivoAdjunto } from "@/lib/supabase"
import { ArrowLeft, Edit, Trash2, Calendar, FileText, Download, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function DetallePresupuesto({ params }: { params: { id: string } }) {
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [archivos, setArchivos] = useState<ArchivoAdjunto[]>([])
  const [loading, setLoading] = useState(true)
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
        .order("created_at", { ascending: true })

      if (archivosError) throw archivosError
      setArchivos(archivosData || [])
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

  const eliminarPresupuesto = async () => {
    if (!presupuesto) return

    try {
      // Eliminar archivos del storage
      if (archivos.length > 0) {
        const rutasArchivos = archivos.map((archivo) => archivo.ruta_archivo)
        await supabase.storage.from("presupuestos-archivos").remove(rutasArchivos)
      }

      // Eliminar presupuesto
      const { error } = await supabase.from("presupuestos").delete().eq("id", params.id)

      if (error) throw error

      toast({
        title: "Presupuesto eliminado",
        description: "El presupuesto se ha eliminado correctamente.",
      })

      router.push("/presupuestos")
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el presupuesto.",
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

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatearFechaCorta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const esFechaVencida = (fecha: string) => {
    return new Date(fecha) < new Date()
  }

  const diasRestantes = (fecha: string) => {
    const hoy = new Date()
    const fechaLimite = new Date(fecha)
    const diferencia = fechaLimite.getTime() - hoy.getTime()
    const dias = Math.ceil(diferencia / (1000 * 3600 * 24))
    return dias
  }

  const formatearTamaño = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <Card>
            <CardHeader>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!presupuesto) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Presupuesto no encontrado</h3>
            <p className="text-gray-600 mb-4">El presupuesto que buscas no existe o ha sido eliminado.</p>
            <Button asChild>
              <Link href="/presupuestos">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Presupuestos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const vencido = esFechaVencida(presupuesto.fecha_limite)
  const dias = diasRestantes(presupuesto.fecha_limite)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/presupuestos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Presupuestos
          </Link>
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/presupuestos/${presupuesto.id}/editar`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente el presupuesto "{presupuesto.titulo}" y
                  todos sus archivos adjuntos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={eliminarPresupuesto} className="bg-red-600 hover:bg-red-700">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Información principal del presupuesto */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{presupuesto.titulo}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Fecha límite: {formatearFecha(presupuesto.fecha_limite)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {vencido ? (
                <Badge variant="destructive" className="text-sm">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Vencido
                </Badge>
              ) : dias <= 3 ? (
                <Badge variant="secondary" className="text-sm bg-yellow-100 text-yellow-800">
                  <Clock className="h-3 w-3 mr-1" />
                  {dias === 0 ? "Vence hoy" : `${dias} día${dias === 1 ? "" : "s"} restante${dias === 1 ? "" : "s"}`}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  {dias} días restantes
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {presupuesto.detalles && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Detalles del Presupuesto</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{presupuesto.detalles}</p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Información de fechas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información de Fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" />
                Fecha de Creación
              </div>
              <p className="text-gray-900">
                {formatearFechaCorta(presupuesto.created_at)} a las {formatearHora(presupuesto.created_at)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Edit className="h-4 w-4" />
                Última Modificación
              </div>
              <p className="text-gray-900">
                {formatearFechaCorta(presupuesto.updated_at)} a las {formatearHora(presupuesto.updated_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Archivos adjuntos */}
      {archivos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Archivos Adjuntos ({archivos.length})
            </CardTitle>
            <CardDescription>Documentos y archivos relacionados con este presupuesto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {archivos.map((archivo) => (
                <div
                  key={archivo.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{archivo.nombre_archivo}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatearTamaño(archivo.tamaño_archivo)}</span>
                        <span>•</span>
                        <span>{archivo.tipo_archivo || "Archivo"}</span>
                        <span>•</span>
                        <span>Subido el {formatearFechaCorta(archivo.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(archivo)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/presupuestos/${presupuesto.id}/editar`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Presupuesto
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/nuevo">
                <FileText className="h-4 w-4 mr-2" />
                Crear Presupuesto Similar
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/presupuestos">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ver Todos los Presupuestos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
