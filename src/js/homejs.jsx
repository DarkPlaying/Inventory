import { useEffect, useState } from "react"
import { supabase } from '../supabase'
import Swal from 'sweetalert2'

let sessionToastCount = 0

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
]

export function useHomeLogic() {
  const [open, setOpen] = useState(false)
  const [showGraphModal, setShowGraphModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [totalf, settotalf] = useState(0)
  const [totaliteam, settotaliteam] = useState(0)
  const [outstock, setoutstock] = useState(0)
  const [sales, settotalsales] = useState(0)
  const [items, setItems] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = (message, type = "error") => {
    setToast({ message, type })
  }

  useEffect(() => {
    async function Grandtotal() {
      const { data, error } = await supabase.from('items').select('*')
      if (data) {
        setItems(data)
        const t = data.reduce((a, x) => a + (Number(x.total_price) || 0), 0)
        settotalf(t)
        settotaliteam(data.length)

        const outItems = data.filter(x => Number(x.quantity) < 20 || x.status === 'OUT')
        const lowItems = data.filter(x => Number(x.quantity) >= 20 && Number(x.quantity) < 30 && x.status !== 'OUT')
        setoutstock(outItems.length)

        const totalQty = data.reduce((a, x) => a + (Number(x.quantity) || 0), 0)
        settotalsales(totalQty)

        const formatNames = (list) => {
          const names = list.map(x => x.name).filter(Boolean)
          if (names.length === 0) return ""
          if (names.length === 1) return names[0]
          if (names.length === 2) return `${names[0]}, ${names[1]}`
          return `${names[0]}, ${names[1]}..`
        }

        // No automatic popup alert on page load/refresh
      } else if (error) {
        showToast("Error fetching items: " + error.message, "error")
      }
    }

    Grandtotal()

    const channel = supabase
      .channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        Grandtotal()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Calculate Pie Chart slices from Supabase items table
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 1
  let cumulativeAngle = 0
  const gradientParts = items.map((item, idx) => {
    const qty = Number(item.quantity) || 0
    const percent = (qty / totalQuantity) * 100
    const start = cumulativeAngle
    cumulativeAngle += percent
    return `${COLORS[idx % COLORS.length]} ${start}% ${cumulativeAngle}%`
  })

  const conicGradient = gradientParts.length > 0 ? gradientParts.join(', ') : '#3b82f6 0% 100%'

  const pieSlices = items.map((item, idx) => ({
    id: item.id,
    name: item.name,
    quantity: Number(item.quantity) || 0,
    color: COLORS[idx % COLORS.length],
    percentage: Math.round(((Number(item.quantity) || 0) / totalQuantity) * 100)
  }))

  // Generate & Download high-resolution Pie Chart PNG image
  const downloadPieChart = () => {
    try {
      if (!items || items.length === 0) {
        Swal.fire({
          toast: true,
          position: 'top',
          icon: 'warning',
          title: 'No items available to generate chart',
          showConfirmButton: false,
          timer: 2000
        })
        return
      }

      // 1. Create high-resolution Canvas (800x850)
      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 850
      const ctx = canvas.getContext('2d')

      // White background with clean border
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Header title
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Stock Distribution Pie Chart', 400, 60)

      // Subtitle
      ctx.fillStyle = '#64748b'
      ctx.font = '16px sans-serif'
      ctx.fillText(`Total Items: ${items.length}  |  Total Quantity: ${totalQuantity}`, 400, 95)

      // Pie chart parameters
      const centerX = 400
      const centerY = 310
      const outerRadius = 170
      const innerRadius = 85

      let currentAngle = -0.5 * Math.PI // Start at top (12 o'clock)

      pieSlices.forEach((slice) => {
        const sliceAngle = (slice.quantity / totalQuantity) * 2 * Math.PI
        if (sliceAngle <= 0) return

        ctx.beginPath()
        ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle)
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true)
        ctx.closePath()

        ctx.fillStyle = slice.color
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.stroke()

        currentAngle += sliceAngle
      })

      // Inner donut hole
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      // Center statistics
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${totalQuantity}`, centerX, centerY - 10)

      ctx.fillStyle = '#64748b'
      ctx.font = '14px sans-serif'
      ctx.fillText('Total Qty', centerX, centerY + 22)

      // Divider line
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(60, 520)
      ctx.lineTo(740, 520)
      ctx.stroke()

      // Legend Section
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 18px sans-serif'
      ctx.fillText('Stock Breakdown:', 60, 555)

      const startY = 590
      const colWidth = 340
      const rowHeight = 36

      pieSlices.slice(0, 12).forEach((slice, idx) => {
        const col = idx % 2
        const row = Math.floor(idx / 2)
        const x = 60 + col * colWidth
        const y = startY + row * rowHeight

        // Color dot
        ctx.beginPath()
        ctx.arc(x + 10, y - 6, 8, 0, 2 * Math.PI)
        ctx.fillStyle = slice.color
        ctx.fill()

        // Name
        ctx.fillStyle = '#334155'
        ctx.font = 'bold 15px sans-serif'
        const displayName = slice.name.length > 18 ? slice.name.slice(0, 16) + '..' : slice.name
        ctx.fillText(displayName, x + 26, y)

        // Quantity & percent
        ctx.fillStyle = '#64748b'
        ctx.font = '14px sans-serif'
        ctx.fillText(`${slice.quantity} (${slice.percentage}%)`, x + 200, y)
      })

      // Watermark / timestamp
      ctx.fillStyle = '#94a3b8'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Generated by Inventory App • ${new Date().toLocaleDateString()}`, 400, 825)

      // 2. Single Download Trigger
      const dataUrl = canvas.toDataURL('image/png')
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = 'stock_pie_chart.png'
      document.body.appendChild(anchor)
      anchor.click()
      setTimeout(() => document.body.removeChild(anchor), 300)

      // Success Toast
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'success',
        title: 'Pie Chart Downloaded!',
        text: 'Saved as stock_pie_chart.png',
        showConfirmButton: false,
        timer: 2500
      })
    } catch (err) {
      console.error('Error downloading pie chart:', err)
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'error',
        title: 'Download failed: ' + err.message,
        showConfirmButton: false,
        timer: 3000
      })
    }
  }

  return {
    open, setOpen,
    showGraphModal, setShowGraphModal,
    showStatusModal, setShowStatusModal,
    totalf, totaliteam, outstock, sales,
    items, toast, setToast,
    totalQuantity, conicGradient, pieSlices,
    downloadPieChart
  }
}

export const useTotal = useHomeLogic
export default useHomeLogic
