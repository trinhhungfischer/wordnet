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

// Custom plugin to provide local API for managing levels dynamically
const levelsApiPlugin = () => ({
  name: 'levels-api',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      // Parse request URL
      const url = new URL(req.url, 'http://localhost');
      
      const sendJson = (data: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };

      // 1. GET /api/config-levels
      if (url.pathname === '/api/config-levels' && req.method === 'GET') {
        let levelsDir = 'public/real_levels';
        const configPath = path.resolve(__dirname, 'levels_config.json');
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.levelsDir) levelsDir = config.levelsDir;
          } catch (e) {}
        } else {
          fs.writeFileSync(configPath, JSON.stringify({ levelsDir }, null, 2), 'utf-8');
        }
        return sendJson({ success: true, levelsDir });
      }

      // 2. POST /api/config-levels
      if (url.pathname === '/api/config-levels' && req.method === 'POST') {
        const chunks: any[] = [];
        req.on('data', (chunk: any) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf-8');
            const { levelsDir } = JSON.parse(body);
            if (!levelsDir) {
              res.statusCode = 400;
              return sendJson({ success: false, error: 'levelsDir is required' });
            }
            const configPath = path.resolve(__dirname, 'levels_config.json');
            fs.writeFileSync(configPath, JSON.stringify({ levelsDir }, null, 2), 'utf-8');
            return sendJson({ success: true, levelsDir });
          } catch (e) {
            res.statusCode = 500;
            return sendJson({ success: false, error: 'Failed to write config' });
          }
        });
        return;
      }

      // 3. GET /api/levels-list
      if (url.pathname === '/api/levels-list' && req.method === 'GET') {
        let levelsDir = 'public/real_levels';
        const configPath = path.resolve(__dirname, 'levels_config.json');
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.levelsDir) levelsDir = config.levelsDir;
          } catch (e) {}
        }
        
        const resolvedPath = path.isAbsolute(levelsDir) 
          ? levelsDir 
          : path.resolve(__dirname, levelsDir);

        if (!fs.existsSync(resolvedPath)) {
          try {
            fs.mkdirSync(resolvedPath, { recursive: true });
          } catch (e) {
            res.statusCode = 500;
            return sendJson({ success: false, error: `Directory ${resolvedPath} does not exist and could not be created.` });
          }
        }

        try {
          const files = fs.readdirSync(resolvedPath);
          const levelNames = files
            .filter(f => f.endsWith('.json') && f !== 'index.json')
            .map(f => f.replace(/\.json$/, ''));

          // Natural sorting
          levelNames.sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
          });

          return sendJson({ success: true, levels: levelNames, levelsDir });
        } catch (e) {
          res.statusCode = 500;
          return sendJson({ success: false, error: 'Failed to read levels directory' });
        }
      }

      // 4. GET /api/load-level
      if (url.pathname === '/api/load-level' && req.method === 'GET') {
        const name = url.searchParams.get('name');
        if (!name) {
          res.statusCode = 400;
          return sendJson({ success: false, error: 'name is required' });
        }

        let levelsDir = 'public/real_levels';
        const configPath = path.resolve(__dirname, 'levels_config.json');
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.levelsDir) levelsDir = config.levelsDir;
          } catch (e) {}
        }

        const resolvedPath = path.isAbsolute(levelsDir) 
          ? levelsDir 
          : path.resolve(__dirname, levelsDir);
        
        const filePath = path.join(resolvedPath, `${name}.json`);
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          return sendJson({ success: false, error: `Level file not found: ${filePath}` });
        }

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          return res.end(content);
        } catch (e) {
          res.statusCode = 500;
          return sendJson({ success: false, error: 'Failed to read level file' });
        }
      }

      // 5. POST /api/save-level
      if (url.pathname === '/api/save-level' && req.method === 'POST') {
        const chunks: any[] = [];
        req.on('data', (chunk: any) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf-8');
            const { name, data } = JSON.parse(body);
            if (!name || !data) {
              res.statusCode = 400;
              return sendJson({ success: false, error: 'name and data are required' });
            }

            let levelsDir = 'public/real_levels';
            const configPath = path.resolve(__dirname, 'levels_config.json');
            if (fs.existsSync(configPath)) {
              try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                if (config.levelsDir) levelsDir = config.levelsDir;
              } catch (e) {}
            }

            const resolvedPath = path.isAbsolute(levelsDir) 
              ? levelsDir 
              : path.resolve(__dirname, levelsDir);

            if (!fs.existsSync(resolvedPath)) {
              fs.mkdirSync(resolvedPath, { recursive: true });
            }

            const filePath = path.join(resolvedPath, `${name}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            
            // Also write index.json if we are in public/levels or public/real_levels to maintain compatibility
            if (levelsDir === 'public/levels' || levelsDir === 'public/real_levels') {
              try {
                const files = fs.readdirSync(resolvedPath);
                const levelNames = files
                  .filter(f => f.endsWith('.json') && f !== 'index.json')
                  .map(f => f.replace(/\.json$/, ''))
                  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
                
                fs.writeFileSync(path.join(resolvedPath, 'index.json'), JSON.stringify(levelNames, null, 2), 'utf-8');
              } catch (e) {}
            }

            return sendJson({ success: true, message: `Level ${name} saved successfully` });
          } catch (e) {
            res.statusCode = 500;
            return sendJson({ success: false, error: 'Failed to save level' });
          }
        });
        return;
      }

      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dictionaryApiPlugin(), levelsApiPlugin()],
})
