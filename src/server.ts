import cors from 'cors'
import express from 'express'
import * as fs from 'fs'
import * as mupdf from 'mupdf'
import path from 'path'

const app = express()
const PORT = 8080

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.get('/convert-pdf', async (req, res) => {
  try {
    const { url } = req.query
    if (!url) {
      return res.status(400).json({ error: 'PDF URL is required' })
    }

    const response = await fetch(url as string)
    const buffer = await response.arrayBuffer()

    const document = mupdf.Document.openDocument(buffer, 'application/pdf')

    const images = []

    for (let i = 0; i < document.countPages(); i++) {
      const page = document.loadPage(i)

      const pixmap = page.toPixmap(
        mupdf.Matrix.identity,
        mupdf.ColorSpace.DeviceRGB,
        false,
        true
      )

      const pngImage = pixmap.asPNG()
      const imageName = `page-${i + 1}-${Date.now()}.png`
      const imagePath = path.join('public', imageName)

      fs.writeFileSync(imagePath, pngImage)

      images.push(`${req.protocol}://${req.get('host')}/${imageName}`)
    }

    res.json({ images })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ error: 'An error occurred while processing the PDF.' })
  }
})

app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`)
})

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message })
    } else {
      console.error(err)
      res
        .status(500)
        .json({ error: 'An error occurred while processing the PDF.' })
    }
    next()
  }
)
