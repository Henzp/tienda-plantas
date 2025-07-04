#!/usr/bin/env node
// 🚀 SCRIPT DE CONFIGURACIÓN AUTOMÁTICA PARA CLOUDFLARE
// Archivo: cloudflare/scripts/setup-cloudflare.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 🎨 Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'cyan');
  console.log('='.repeat(60));
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 🔧 CONFIGURACIÓN
const CONFIG = {
  // Variables que se configurarán como secretas en Cloudflare
  secrets: {
    MONGODB_URI: 'mongodb+srv://tamypau:Isii2607@bd-plantas.2idkemi.mongodb.net/tienda-plantas?retryWrites=true&w=majority&appName=BD-PLANTAS',
    ADMIN_USERNAME: 'tamypau',
    ADMIN_PASSWORD: 'Isii2607',
    SESSION_SECRET: 'tienda-plantas-secret-key-2024',
    CLOUDINARY_CLOUD_NAME: 'dqi6yvjxt',
    CLOUDINARY_API_KEY: '713778997184742',
    CLOUDINARY_API_SECRET: 'dsq3LwGEg24B3y6hDWGo8VrYFts'
  },
  
  // Configuración del worker
  worker: {
    name: 'tienda-plantas-api',
    subdomain: null // Se configurará automáticamente
  },
  
  // Configuración de Pages
  pages: {
    name: 'tienda-plantas-frontend',
    subdomain: null // Se configurará automáticamente
  }
};

// 🛠️ FUNCIONES DE UTILIDAD
function runCommand(command, description) {
  try {
    info(`Ejecutando: ${description}`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return result;
  } catch (error) {
    error(`Error en: ${description}`);
    error(error.message);
    process.exit(1);
  }
}

function checkPrerequisites() {
  header('🔍 VERIFICANDO PREREQUISITOS');
  
  try {
    runCommand('wrangler --version', 'Verificando Wrangler CLI');
    success('Wrangler CLI instalado');
  } catch {
    error('Wrangler CLI no encontrado. Instálalo con: npm install -g wrangler');
    process.exit(1);
  }
  
  try {
    runCommand('wrangler whoami', 'Verificando autenticación');
    success('Autenticado en Cloudflare');
  } catch {
    warning('No estás autenticado en Cloudflare');
    info('Ejecuta: wrangler login');
    process.exit(1);
  }
}

function setupSecrets() {
  header('🔑 CONFIGURANDO SECRETOS DEL WORKER');
  
  Object.entries(CONFIG.secrets).forEach(([key, value]) => {
    try {
      info(`Configurando secreto: ${key}`);
      
      // Crear comando para configurar secreto
      const command = `echo "${value}" | wrangler secret put ${key}`;
      execSync(command, { stdio: 'inherit' });
      
      success(`Secreto ${key} configurado`);
    } catch (error) {
      error(`Error configurando secreto ${key}: ${error.message}`);
    }
  });
}

function deployWorker() {
  header('🚀 DEPLOYANDO WORKER');
  
  try {
    const result = runCommand('wrangler deploy', 'Deployando Worker');
    success('Worker deployado exitosamente');
    
    // Extraer URL del worker del output
    const urlMatch = result.match(/https:\/\/([^\/]+\.workers\.dev)/);
    if (urlMatch) {
      CONFIG.worker.subdomain = urlMatch[1];
      success(`Worker disponible en: https://${CONFIG.worker.subdomain}`);
    }
    
    return result;
  } catch (error) {
    error('Error deployando Worker');
    throw error;
  }
}

function copyAssets() {
  header('📁 COPIANDO ARCHIVOS PARA PAGES');
  
  const sourceDir = path.join(__dirname, '../../');
  const targetDir = path.join(__dirname, '../pages-build');
  
  // Crear directorio de build si no existe
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copiar archivos necesarios
  const filesToCopy = [
    { src: 'views/', dest: 'views/' },
    { src: 'public/', dest: 'public/' },
    { src: 'cloudflare/_headers', dest: '_headers' },
    { src: 'cloudflare/_redirects', dest: '_redirects' },
    { src: 'cloudflare/public/js/main.js', dest: 'public/js/main.js' }
  ];
  
  filesToCopy.forEach(({ src, dest }) => {
    const srcPath = path.join(sourceDir, src);
    const destPath = path.join(targetDir, dest);
    
    try {
      if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
          runCommand(`cp -r "${srcPath}" "${path.dirname(destPath)}"`, `Copiando directorio ${src}`);
        } else {
          runCommand(`cp "${srcPath}" "${destPath}"`, `Copiando archivo ${src}`);
        }
        success(`Copiado: ${src} → ${dest}`);
      } else {
        warning(`Archivo no encontrado: ${src}`);
      }
    } catch (error) {
      error(`Error copiando ${src}: ${error.message}`);
    }
  });
  
  // Actualizar URLs en main.js
  updateMainJsUrls(targetDir);
}

function updateMainJsUrls(buildDir) {
  const mainJsPath = path.join(buildDir, 'public/js/main.js');
  
  if (fs.existsSync(mainJsPath)) {
    let content = fs.readFileSync(mainJsPath, 'utf8');
    
    // Actualizar URL del worker si se obtuvo
    if (CONFIG.worker.subdomain) {
      content = content.replace(
        'https://tienda-plantas-api.tu-usuario.workers.dev',
        `https://${CONFIG.worker.subdomain}`
      );
      success('URLs del Worker actualizadas en main.js');
    }
    
    fs.writeFileSync(mainJsPath, content);
  }
}

function updateRedirects(buildDir) {
  const redirectsPath = path.join(buildDir, '_redirects');
  
  if (fs.existsSync(redirectsPath) && CONFIG.worker.subdomain) {
    let content = fs.readFileSync(redirectsPath, 'utf8');
    
    content = content.replace(
      /https:\/\/tienda-plantas-api\.tu-usuario\.workers\.dev/g,
      `https://${CONFIG.worker.subdomain}`
    );
    
    fs.writeFileSync(redirectsPath, content);
    success('URLs del Worker actualizadas en _redirects');
  }
}

function createPages() {
  header('📄 CONFIGURANDO CLOUDFLARE PAGES');
  
  const buildDir = path.join(__dirname, '../pages-build');
  
  info('Para configurar Cloudflare Pages:');
  info('1. Ve a https://dash.cloudflare.com');
  info('2. Workers & Pages → Create Application → Pages');
  info('3. Connect to Git → Selecciona tu repositorio');
  info('4. Configuración de build:');
  info('   - Build command: echo "No build needed"');
  info('   - Build output directory: cloudflare/pages-build');
  info('   - Root directory: / (dejar vacío)');
  info(`5. Archivos de build listos en: ${buildDir}`);
  
  if (CONFIG.worker.subdomain) {
    info(`6. URL del Worker: https://${CONFIG.worker.subdomain}`);
  }
}

function generateSummary() {
  header('📋 RESUMEN DE CONFIGURACIÓN');
  
  success('✅ Worker deployado');
  if (CONFIG.worker.subdomain) {
    info(`   URL: https://${CONFIG.worker.subdomain}`);
  }
  
  success('✅ Secretos configurados');
  Object.keys(CONFIG.secrets).forEach(key => {
    info(`   ${key}: Configurado`);
  });
  
  success('✅ Archivos de Pages preparados');
  info('   Directorio: cloudflare/pages-build/');
  
  console.log('\n🎯 PRÓXIMOS PASOS:');
  info('1. Configura Cloudflare Pages siguiendo las instrucciones');
  info('2. Actualiza las URLs en el código si es necesario');
  info('3. Testa tu aplicación');
  info('4. ¡Disfruta tu tienda en Cloudflare! 🎉');
}

// 🚀 FUNCIÓN PRINCIPAL
async function main() {
  try {
    console.log('🌐 CONFIGURACIÓN AUTOMÁTICA DE CLOUDFLARE');
    console.log('Entre Hojas y Amigas - Setup Script');
    console.log('=====================================\n');
    
    checkPrerequisites();
    setupSecrets();
    deployWorker();
    copyAssets();
    updateRedirects(path.join(__dirname, '../pages-build'));
    createPages();
    generateSummary();
    
    success('\n🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!');
    
  } catch (error) {
    error('\n💥 Error durante la configuración:');
    error(error.message);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  CONFIG,
  main,
  checkPrerequisites,
  setupSecrets,
  deployWorker,
  copyAssets,
  createPages
};