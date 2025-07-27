"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase, type Presupuesto } from "@/lib/supabase"
import { Edit, Trash2, Calendar, Plus } from "lucide-react"
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

export default function VerPresupuestos() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    cargarPresupuestos()
  }, [])

  const cargarPresupuestos = async () => {
    try {
      const { data, error } = await supabase.from("presupuestos").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setPresupuestos(data || [])
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los presupuestos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const eliminarPresupuesto = async (id: string) => {
    try {
      // Eliminar archivos del storage
      const { data: archivos } = await supabase
        .from("archivos_adjuntos")
        .select("ruta_archivo")
        .eq("presupuesto_id", id)

      if (archivos && archivos.length > 0) {
        const rutasArchivos = archivos.map((archivo) => archivo.ruta_archivo)
        await supabase.storage.from("presupuestos-archivos").remove(rutasArchivos)
      }

      // Eliminar presupuesto (los archivos adjuntos se eliminan por CASCADE)
      const { error } = await supabase.from("presupuestos").delete().eq("id", id)

      if (error) throw error

      setPresupuestos((prev) => prev.filter((p) => p.id !== id))
      toast({
        title: "Presupuesto eliminado",
        description: "El presupuesto se ha eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el presupuesto.",
        variant: "destructive",
      })
    }
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const esFechaVencida = (fecha: string) => {
    return new Date(fecha) < new Date()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Presupuestos</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Presupuestos</h1>
        <Button asChild>
          <Link href="/nuevo">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Presupuesto
          </Link>
        </Button>
      </div>

      {presupuestos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No hay presupuestos</h3>
              <p className="mb-4">Comienza creando tu primer presupuesto</p>
              <Button asChild>
                <Link href="/nuevo">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Presupuesto
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {presupuestos.map((presupuesto) => (
            <Card key={presupuesto.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      <Link
                        href={`/presupuestos/${presupuesto.id}`}
                        className="hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {presupuesto.titulo}
                      </Link>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Fecha límite: {formatearFecha(presupuesto.fecha_limite)}</span>
                      {esFechaVencida(presupuesto.fecha_limite) && <Badge variant="destructive">Vencido</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/presupuestos/${presupuesto.id}/editar`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el presupuesto "
                            {presupuesto.titulo}" y todos sus archivos adjuntos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => eliminarPresupuesto(presupuesto.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              {presupuesto.detalles && (
                <CardContent className="pt-0">
                  <CardDescription className="text-sm">
                    {presupuesto.detalles.length > 150
                      ? `${presupuesto.detalles.substring(0, 150)}...`
                      : presupuesto.detalles}
                  </CardDescription>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
