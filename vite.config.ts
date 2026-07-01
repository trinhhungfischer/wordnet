import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom plugin to provide local API for updating dictionary
const dictionaryApiPlugin = () => ({
  name: 'dictionary-api',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/update-dictionary' && req.method === 'POST') {
        const chunks: any[] = []
        req.on('data', (chunk: any) => {
          chunks.push(chunk)
        })
        
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf-8')
            const newData = JSON.parse(body)
            const filePathSrc = path.resolve(__dirname, 'src/data/global_dictionary.json')
            const filePathPublic = path.resolve(__dirname, 'public/global_dictionary.json')
            
            // Read existing data if necessary, or just overwrite
            // Assuming the client sends the FULL updated dictionary to be overwritten
            fs.writeFileSync(filePathSrc, JSON.stringify(newData, null, 2), 'utf-8')
            fs.writeFileSync(filePathPublic, JSON.stringify(newData, null, 2), 'utf-8')
            
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, message: 'Dictionary updated successfully' }))
          } catch (error) {
            console.error('Error writing dictionary:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: 'Error writing file' }))
          }
        })
      } else {
        next()
      }
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dictionaryApiPlugin()],
})
