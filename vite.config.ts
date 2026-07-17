import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

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

      // 2.5 POST /api/browse-directory
      if (url.pathname === '/api/browse-directory' && req.method === 'POST') {
        const psScript = `Add-Type -AssemblyName System.Windows.Forms
$f = New-Object System.Windows.Forms.FolderBrowserDialog
$f.ShowNewFolderButton = $true
$f.Description = "Select Levels Directory"
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
if ($f.ShowDialog($form) -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $f.SelectedPath
}`;
        const tempScriptPath = path.resolve(__dirname, 'levels_browse_temp.ps1');
        try {
          fs.writeFileSync(tempScriptPath, psScript, 'utf-8');
          exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, (error: any, stdout: string) => {
            try {
              if (fs.existsSync(tempScriptPath)) {
                fs.unlinkSync(tempScriptPath);
              }
            } catch (e) {}

            if (error) {
              console.error('Directory browser error:', error);
              res.statusCode = 500;
              return sendJson({ success: false, error: 'Failed to open directory browser' });
            }
            const selectedPath = stdout.trim();
            if (selectedPath) {
              return sendJson({ success: true, selectedPath });
            } else {
              return sendJson({ success: false, cancelled: true });
            }
          });
        } catch (e) {
          console.error('Failed to create temp script:', e);
          res.statusCode = 500;
          return sendJson({ success: false, error: 'Failed to initialize directory browser' });
        }
        return;
      }

      // 2.6 GET /api/list-subdirectories
      if (url.pathname === '/api/list-subdirectories' && req.method === 'GET') {
        let dirPath = url.searchParams.get('path') || '';
        
        // Handle drive selection list
        if (dirPath === 'DRIVES') {
          const drives = [];
          for (let i = 65; i <= 90; i++) {
            const drive = String.fromCharCode(i) + ':/';
            try {
              if (fs.existsSync(drive)) {
                drives.push({ name: drive, path: drive });
              }
            } catch (e) {}
          }
          return sendJson({
            success: true,
            currentPath: 'DRIVES',
            parentPath: null,
            subdirectories: drives
          });
        }

        if (!dirPath) {
          dirPath = __dirname;
        }

        const resolvedPath = path.resolve(dirPath).replace(/\\/g, '/');
        
        // If we are at root of a drive (e.g. "C:/"), parent should be "DRIVES"
        const isDriveRoot = /^[A-Z]:\/$/i.test(resolvedPath) || /^[A-Z]:$/i.test(resolvedPath);
        const parentPath = isDriveRoot ? 'DRIVES' : path.dirname(resolvedPath).replace(/\\/g, '/');

        try {
          const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
          const subdirs = entries
            .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
            .map(entry => ({
              name: entry.name,
              path: path.join(resolvedPath, entry.name).replace(/\\/g, '/')
            }));

          subdirs.sort((a, b) => a.name.localeCompare(b.name));

          return sendJson({
            success: true,
            currentPath: resolvedPath,
            parentPath,
            subdirectories: subdirs
          });
        } catch (e) {
          res.statusCode = 500;
          return sendJson({ success: false, error: 'Permission denied or directory not found' });
        }
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
