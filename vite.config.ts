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
      } else if (req.url?.startsWith('/api/list-levels') && req.method === 'GET') {
        try {
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          const dirParam = urlObj.searchParams.get('dir') || 'real_levels';
          const safeDir = path.normalize(dirParam).replace(/^(\.\.[\/\\])+/, '');
          const targetPath = path.resolve(__dirname, 'public', safeDir);
          
          if (!fs.existsSync(targetPath)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
            return;
          }
          
          const files = fs.readdirSync(targetPath);
          const levelNames = files
            .filter(f => f.endsWith('.json') && f !== 'index.json')
            .map(f => f.replace('.json', ''));
            
          levelNames.sort((a, b) => {
            const numA = parseInt(a.replace(/[^0-9]/g, ''));
            const numB = parseInt(b.replace(/[^0-9]/g, ''));
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.localeCompare(b);
          });
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(levelNames));
        } catch (error) {
          console.error('Error reading levels directory:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Error reading directory' }));
        }
      } else if (req.url === '/api/update-changelog' && req.method === 'POST') {
        const chunks: any[] = []
        req.on('data', (chunk: any) => chunks.push(chunk))
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf-8')
            const newData = JSON.parse(body)
            const filePathSrc = path.resolve(__dirname, 'src/data/changelog.json')
            const filePathPublic = path.resolve(__dirname, 'public/changelog.json')
            fs.writeFileSync(filePathSrc, JSON.stringify(newData, null, 2), 'utf-8')
            fs.writeFileSync(filePathPublic, JSON.stringify(newData, null, 2), 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, message: 'Changelog updated' }))
          } catch (error) {
            console.error('Error writing changelog:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: 'Error writing file' }))
          }
        })
      } else if (req.url === '/api/publish-update' && req.method === 'POST') {
        const chunks: any[] = []
        req.on('data', (chunk: any) => chunks.push(chunk))
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf-8')
            const { stagedLevels, note } = JSON.parse(body)
            
            // 1. Write each level to public/real_levels/
            const levelNames = Object.keys(stagedLevels)
            levelNames.forEach(fileName => {
              const safeFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
              const filePath = path.resolve(__dirname, 'public/real_levels', safeFileName)
              fs.writeFileSync(filePath, JSON.stringify(stagedLevels[fileName], null, 2), 'utf-8')
            });

            // 2. Read changelog.json, append new version, write it back
            const changelogPathSrc = path.resolve(__dirname, 'src/data/changelog.json')
            const changelogPathPublic = path.resolve(__dirname, 'public/changelog.json')
            
            let changelogData: any[] = []
            if (fs.existsSync(changelogPathSrc)) {
              changelogData = JSON.parse(fs.readFileSync(changelogPathSrc, 'utf-8'))
            }

            // Calculate next version
            let nextVersionNum = 1;
            if (changelogData.length > 0) {
              const lastVersion = changelogData[changelogData.length - 1].version;
              const match = lastVersion.match(/v(\d+)/i);
              if (match) {
                nextVersionNum = parseInt(match[1]) + 1;
              } else {
                nextVersionNum = changelogData.length + 1;
              }
            }
            const newVersionStr = `v${nextVersionNum}`;
            
            // Use simple local time format "HH:mm DD/MM/YYYY" for display
            const now = new Date();
            const dateStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
            
            const levelsListStr = levelNames.map(f => f.replace('.json', '')).join(', ');

            const newEntry = {
              version: newVersionStr,
              levels: levelsListStr,
              date: dateStr,
              note: note || ''
            };

            changelogData.push(newEntry);
            
            fs.writeFileSync(changelogPathSrc, JSON.stringify(changelogData, null, 2), 'utf-8')
            fs.writeFileSync(changelogPathPublic, JSON.stringify(changelogData, null, 2), 'utf-8')

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, version: newVersionStr, entry: newEntry }))
          } catch (error) {
            console.error('Error publishing update:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: 'Error publishing update' }))
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
