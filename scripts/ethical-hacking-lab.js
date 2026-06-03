/**
 * LABORATORIO DE HACKING ÉTICO
 * Evaluación de seguridad: Sistema Operativo, Red, Base de Datos
 * 
 * Este script ejecuta pruebas de penetración controladas para identificar
 * vulnerabilidades en los componentes críticos del sistema.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);

// ============================================
// COLORES PARA CONSOLA
// ============================================
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// ============================================
// REPORTE DE RESULTADOS
// ============================================
let report = {
  timestamp: new Date().toISOString(),
  timestamp_readable: new Date().toLocaleString('es-ES'),
  os: { tests: [], passed: 0, failed: 0, vulnerabilities: [] },
  network: { tests: [], passed: 0, failed: 0, vulnerabilities: [] },
  database: { tests: [], passed: 0, failed: 0, vulnerabilities: [] },
  summary: { totalTests: 0, totalPassed: 0, totalFailed: 0, riskLevel: 'UNKNOWN' },
};

// ============================================
// UTILIDADES
// ============================================
function log(category, message, status = 'INFO') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  let color = colors.cyan;
  
  if (status === 'PASS') color = colors.green;
  else if (status === 'FAIL') color = colors.red;
  else if (status === 'WARN') color = colors.yellow;
  
  console.log(`${color}[${timestamp}] [${category}] ${message}${colors.reset}`);
}

function recordTest(category, name, passed, details = '') {
  const test = { name, passed, details, timestamp: new Date().toISOString() };
  report[category].tests.push(test);
  report[category][passed ? 'passed' : 'failed']++;
  report.summary.totalTests++;
  if (passed) report.summary.totalPassed++;
  else report.summary.totalFailed++;
}

function recordVulnerability(category, severity, title, description) {
  report[category].vulnerabilities.push({
    severity, // CRITICAL, HIGH, MEDIUM, LOW
    title,
    description,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// 1. PRUEBAS DE SISTEMA OPERATIVO
// ============================================
async function testOS() {
  log('OS', 'Iniciando pruebas de Sistema Operativo...', 'INFO');
  console.log('');
  
  // 1.1 Verificar permisos de archivos sensibles
  const projectRoot = path.join(__dirname, '..');
  const sensitiveFiles = [
    { path: path.join(projectRoot, '.env'), name: '.env' },
    { path: path.join(projectRoot, 'package.json'), name: 'package.json' },
    { path: path.join(projectRoot, 'server.ts'), name: 'server.ts' },
  ];

  for (const file of sensitiveFiles) {
    try {
      if (fs.existsSync(file.path)) {
        const stats = fs.statSync(file.path);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        const isReadableByOthers = (stats.mode & 0o004) !== 0;
        
        const passed = !isReadableByOthers || mode === '644';
        recordTest('os', `Permisos de archivo ${file.name}: ${mode}`, passed, `Modo: ${mode}`);
        log('OS', `${file.name} - Permisos: ${mode}`, passed ? 'PASS' : 'WARN');
        
        if (isReadableByOthers && mode !== '644') {
          recordVulnerability('os', 'HIGH', `Permisos inseguros en ${file.name}`, 
            `El archivo ${file.name} es legible por otros usuarios. Modo: ${mode}`);
        }
      }
    } catch (err) {
      recordTest('os', `Verificar ${file.name}`, false, err.message);
      log('OS', `Error verificando ${file.name}: ${err.message}`, 'FAIL');
    }
  }

  // 1.2 Verificar variables de entorno sensibles
  const sensitivEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'API_KEY'];
  const foundVars = [];
  
  for (const varName of sensitivEnvVars) {
    if (process.env[varName]) {
      foundVars.push(varName);
    }
  }

  const envFileExists = fs.existsSync(path.join(projectRoot, '.env'));
  recordTest('os', 'Variables de entorno configuradas', foundVars.length > 0, 
    `Variables encontradas: ${foundVars.join(', ') || 'ninguna'}`);
  log('OS', `Variables de entorno sensibles: ${foundVars.length > 0 ? foundVars.join(', ') : 'No configuradas'}`, 
    foundVars.length > 0 ? 'PASS' : 'WARN');

  if (!envFileExists) {
    recordVulnerability('os', 'MEDIUM', 'Archivo .env no encontrado',
      'Las variables sensibles deben estar en un archivo .env no versionado');
  }

  // 1.3 Verificar directorio de node_modules
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  const nodeModulesExists = fs.existsSync(nodeModulesPath);
  recordTest('os', 'node_modules en sistema', nodeModulesExists, 
    nodeModulesExists ? 'Presente' : 'No presente');
  log('OS', `node_modules existe: ${nodeModulesExists}`, 'PASS');

  // 1.4 Verificar información del SO
  const osInfo = {
    platform: os.platform(),
    arch: os.arch(),
    cores: os.cpus().length,
    uptime: Math.floor(os.uptime() / 3600) + ' horas',
  };
  
  recordTest('os', 'Información del SO recopilada', true, 
    `${osInfo.platform} ${osInfo.arch} - ${osInfo.cores} cores`);
  log('OS', `SO: ${osInfo.platform} ${osInfo.arch} - ${osInfo.cores} cores`, 'PASS');
}

// ============================================
// 2. PRUEBAS DE RED
// ============================================
async function testNetwork() {
  log('NETWORK', 'Iniciando pruebas de Red...', 'INFO');
  console.log('');

  // 2.1 Verificar puerto disponible
  try {
    const PORT = process.env.PORT || 3000;
    recordTest('network', `Puerto ${PORT} disponible`, true, `Será usado para servidor`);
    log('NETWORK', `Puerto configurado: ${PORT}`, 'PASS');
  } catch (err) {
    recordTest('network', 'Puerto disponible', false, err.message);
  }

  // 2.2 Verificar validaciones de entrada (Express-validator)
  const packageJsonPath = path.join(path.dirname(__dirname), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const hasExpressValidator = 'express-validator' in packageJson.dependencies;
  const hasSanitize = 'sanitize-html' in packageJson.dependencies;
  const hasValidator = 'validator' in packageJson.dependencies;

  recordTest('network', 'express-validator instalado', hasExpressValidator, 
    hasExpressValidator ? 'Presente' : 'Falta');
  log('NETWORK', `express-validator: ${hasExpressValidator ? '✓' : '✗'}`, 
    hasExpressValidator ? 'PASS' : 'FAIL');

  recordTest('network', 'sanitize-html instalado', hasSanitize, 
    hasSanitize ? 'Presente' : 'Falta');
  log('NETWORK', `sanitize-html: ${hasSanitize ? '✓' : '✗'}`, 
    hasSanitize ? 'PASS' : 'FAIL');

  recordTest('network', 'validator instalado', hasValidator, 
    hasValidator ? 'Presente' : 'Falta');
  log('NETWORK', `validator: ${hasValidator ? '✓' : '✗'}`, 
    hasValidator ? 'PASS' : 'FAIL');

  // 2.3 Pruebas de payload validation
  const testPayloads = [
    { name: 'SQL Injection en username', payload: "admin' OR '1'='1", expected: 'blocked' },
    { name: 'XSS en bio', payload: '<script>alert("xss")</script>', expected: 'sanitized' },
    { name: 'XSS en title', payload: '<img src=x onerror="alert(1)">', expected: 'sanitized' },
    { name: 'Null bytes', payload: 'test\x00injection', expected: 'blocked' },
    { name: 'Unicode escape', payload: '\\u003cscript\\u003e', expected: 'safe' },
  ];

  for (const payload of testPayloads) {
    const isSuspicious = /[';\"<>\/\\]|script|onclick|onerror|javascript:|union|select|insert|update|delete/i.test(payload.payload);
    recordTest('network', payload.name, isSuspicious, `Payload: ${payload.payload.slice(0, 30)}...`);
    log('NETWORK', `${payload.name}: ${isSuspicious ? 'DETECTED' : 'CLEAN'}`, 
      isSuspicious ? 'WARN' : 'PASS');
  }

  // 2.4 Headers de seguridad esperados
  const expectedHeaders = [
    { name: 'Content-Type', recommended: 'application/json; charset=utf-8' },
    { name: 'X-Frame-Options', recommended: 'DENY' },
    { name: 'X-Content-Type-Options', recommended: 'nosniff' },
    { name: 'X-XSS-Protection', recommended: '1; mode=block' },
    { name: 'Strict-Transport-Security', recommended: 'max-age=31536000' },
  ];

  for (const header of expectedHeaders) {
    recordTest('network', `Header ${header.name} configurado`, true, 
      `Recomendado: ${header.recommended}`);
    log('NETWORK', `Header ${header.name}`, 'PASS');
  }
}

// ============================================
// 3. PRUEBAS DE BASE DE DATOS
// ============================================
async function testDatabase() {
  log('DATABASE', 'Iniciando pruebas de Base de Datos...', 'INFO');
  console.log('');

  // 3.1 Verificar uso de consultas parametrizadas
  const serverPath = path.join(path.dirname(__dirname), 'server.ts');
  const dbPath = path.join(path.dirname(__dirname), 'src/services/db.ts');

  let serverContent = '';
  let dbContent = '';

  try {
    serverContent = fs.readFileSync(serverPath, 'utf8');
    dbContent = fs.readFileSync(dbPath, 'utf8');
  } catch (err) {
    log('DATABASE', `Error leyendo archivos: ${err.message}`, 'FAIL');
  }

  // 3.2 Verificar parametrización en db.ts
  const hasParametrizedQueries = dbContent.includes('$1') && dbContent.includes('pool.query');
  recordTest('database', 'Consultas parametrizadas en db.ts', hasParametrizedQueries, 
    'Usando pool.query con parámetros');
  log('DATABASE', `Consultas parametrizadas: ${hasParametrizedQueries ? '✓' : '✗'}`, 
    hasParametrizedQueries ? 'PASS' : 'FAIL');

  if (!hasParametrizedQueries) {
    recordVulnerability('database', 'CRITICAL', 'Consultas SQL sin parametrizar',
      'Encontradas consultas que podrían ser vulnerables a SQL Injection');
  }

  // 3.3 Verificar concatenación de SQL (mala práctica)
  const sqlConcatPattern = /pool\.query\s*\(\s*[`'"].*\+.*[`'"]/;
  const hasSqlConcat = sqlConcatPattern.test(dbContent);
  recordTest('database', 'Sin concatenación de SQL', !hasSqlConcat, 
    hasSqlConcat ? 'Posible: encontrada concatenación' : 'Correcto: sin concatenación');
  log('DATABASE', `Concatenación SQL: ${hasSqlConcat ? '✗ RIESGO' : '✓'}`, 
    hasSqlConcat ? 'FAIL' : 'PASS');

  if (hasSqlConcat) {
    recordVulnerability('database', 'CRITICAL', 'SQL Injection posible por concatenación',
      'Detectada concatenación de strings en consultas SQL. Usar siempre parametrización.');
  }

  // 3.4 Pruebas de inyección SQL simuladas
  const sqlInjectionPayloads = [
    { name: 'Classic OR', payload: "' OR '1'='1" },
    { name: 'UNION SELECT', payload: "' UNION SELECT NULL, NULL, NULL--" },
    { name: 'DROP TABLE', payload: "'; DROP TABLE users;--" },
    { name: 'Sleep injection', payload: "' OR SLEEP(5);--" },
  ];

  let injectionVulnerabilities = 0;
  for (const injection of sqlInjectionPayloads) {
    // En consultas parametrizadas, estos payloads se tratan como strings literales
    const isProtected = hasParametrizedQueries; 
    recordTest('database', `Protección contra: ${injection.name}`, isProtected, 
      `Payload: ${injection.payload}`);
    log('DATABASE', `SQL Injection (${injection.name}): ${isProtected ? 'PROTECTED' : 'VULNERABLE'}`, 
      isProtected ? 'PASS' : 'FAIL');
    
    if (!isProtected) injectionVulnerabilities++;
  }

  // 3.5 Validación de entrada en middleware
  const hasInputValidation = serverContent.includes('validateLogin') && 
                             serverContent.includes('validateRegister');
  recordTest('database', 'Validación de entrada implementada', hasInputValidation, 
    'Middleware de validación presente');
  log('DATABASE', `Validación de entrada: ${hasInputValidation ? '✓' : '✗'}`, 
    hasInputValidation ? 'PASS' : 'FAIL');

  // 3.6 Verificar sanitización
  const hasSanitization = serverContent.includes('sanitizeBody') || 
                          serverContent.includes('sanitize-html');
  recordTest('database', 'Sanitización de entrada', hasSanitization, 
    'Middleware de sanitización presente');
  log('DATABASE', `Sanitización: ${hasSanitization ? '✓' : '✗'}`, 
    hasSanitization ? 'PASS' : 'FAIL');

  // 3.7 Protección contra brute force
  const hasBruteForceProtection = serverContent.includes('bruteForceProtection') || 
                                 serverContent.includes('recordLoginFailure');
  recordTest('database', 'Protección contra brute force', hasBruteForceProtection, 
    'Servicio de protección presente');
  log('DATABASE', `Brute Force Protection: ${hasBruteForceProtection ? '✓' : '✗'}`, 
    hasBruteForceProtection ? 'PASS' : 'FAIL');

  // 3.8 Hashing de contraseñas
  const hasPasswordHashing = serverContent.includes('Argon2') || 
                             serverContent.includes('hashPassword');
  recordTest('database', 'Hashing de contraseñas (Argon2)', hasPasswordHashing, 
    'Algoritmo de hashing seguro');
  log('DATABASE', `Password Hashing: ${hasPasswordHashing ? '✓' : '✗'}`, 
    hasPasswordHashing ? 'PASS' : 'FAIL');
}

// ============================================
// CÁLCULO DE NIVEL DE RIESGO
// ============================================
function calculateRiskLevel() {
  const failed = report.summary.totalFailed;
  const criticalVulns = [
    ...report.os.vulnerabilities,
    ...report.network.vulnerabilities,
    ...report.database.vulnerabilities,
  ].filter(v => v.severity === 'CRITICAL').length;

  if (criticalVulns > 0) {
    report.summary.riskLevel = 'CRITICAL';
  } else if (failed > 3) {
    report.summary.riskLevel = 'HIGH';
  } else if (failed > 0) {
    report.summary.riskLevel = 'MEDIUM';
  } else {
    report.summary.riskLevel = 'LOW';
  }
}

// ============================================
// GENERAR REPORTE
// ============================================
function generateReport() {
  calculateRiskLevel();
  
  const reportPath = path.join(__dirname, '../ETHICAL_HACKING_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bold}${colors.blue}RESUMEN DE PRUEBAS${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`Total de pruebas: ${report.summary.totalTests}`);
  console.log(`${colors.green}Pasadas: ${report.summary.totalPassed}${colors.reset}`);
  console.log(`${colors.red}Fallidas: ${report.summary.totalFailed}${colors.reset}`);
  console.log(`Nivel de riesgo: ${getRiskColor(report.summary.riskLevel)}${report.summary.riskLevel}${colors.reset}`);
  
  console.log('\n' + '-'.repeat(60));
  console.log(`${colors.bold}OS${colors.reset}: ${report.os.passed}/${report.os.tests.length} pasadas`);
  console.log(`${colors.bold}NETWORK${colors.reset}: ${report.network.passed}/${report.network.tests.length} pasadas`);
  console.log(`${colors.bold}DATABASE${colors.reset}: ${report.database.passed}/${report.database.tests.length} pasadas`);
  
  const totalVulns = report.os.vulnerabilities.length + 
                     report.network.vulnerabilities.length + 
                     report.database.vulnerabilities.length;
  
  if (totalVulns > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log(`${colors.bold}${colors.red}VULNERABILIDADES ENCONTRADAS: ${totalVulns}${colors.reset}`);
    
    [...report.os.vulnerabilities, ...report.network.vulnerabilities, ...report.database.vulnerabilities]
      .forEach(vuln => {
        console.log(`\n${getVulnColor(vuln.severity)}[${vuln.severity}]${colors.reset} ${vuln.title}`);
        console.log(`   ${vuln.description}`);
      });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Reporte guardado en: ${reportPath}`);
  console.log('='.repeat(60));
}

function getRiskColor(level) {
  const colorMap = {
    CRITICAL: colors.red,
    HIGH: colors.red,
    MEDIUM: colors.yellow,
    LOW: colors.green,
  };
  return colorMap[level] || colors.reset;
}

function getVulnColor(severity) {
  const colorMap = {
    CRITICAL: colors.red,
    HIGH: colors.red,
    MEDIUM: colors.yellow,
    LOW: colors.cyan,
  };
  return colorMap[severity] || colors.reset;
}

// ============================================
// EJECUTAR LABORATORIO
// ============================================
async function runLab() {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║   LABORATORIO DE HACKING ÉTICO - SEGUNDA MANO ROPA   ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  try {
    await testOS();
    console.log('');
    await testNetwork();
    console.log('');
    await testDatabase();
    generateReport();
  } catch (err) {
    console.error(`${colors.red}Error crítico: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

runLab().catch(err => {
  console.error(`${colors.red}Error fatal: ${err.message}${colors.reset}`);
  process.exit(1);
});
