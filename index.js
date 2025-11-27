const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Importamos solo la clase Pool de la librería pg
require('dotenv').config(); // Cargar las variables del archivo .env

const app = express();

// Middlewares (Funciones intermedias que procesan los datos antes de llegar a tus rutas)
app.use(cors()); // Permite conexiones desde otros dominios
app.use(express.json()); // IMPORTANTE: Permite que tu API entienda JSON en el cuerpo de las peticiones (req.body)

// Configuración de la conexión a la Base de Datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡La API está funcionando! 🚀');
});

// Ruta para probar la conexión a BD
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      message: 'Conexión exitosa a la Base de Datos', 
      time: result.rows[0].now 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al conectar a la BD' });
  }
});

// Iniciar el servidor
const port = process.env.PORT || 3000;

// 1. OBTENER TODAS LAS TAREAS
app.get('/tasks', async (req, res) => {
  try {
    // La consulta SQL real
    const result = await pool.query('SELECT * FROM tasks');
    
    // Enviamos al frontend solo las filas (rows), no la metadata técnica de Postgres
    res.json(result.rows); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// 2. CREAR UNA NUEVA TAREA
app.post('/tasks', async (req, res) => {
  // Desestructuramos lo que nos envía el frontend (o Postman)
  const { title, description, user_id } = req.body;

  // Validación básica (Critica: nunca confíes en que el frontend te manda todo bien)
  if (!title || !user_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const query = `
      INSERT INTO tasks (title, description, user_id) 
      VALUES ($1, $2, $3) 
      RETURNING *`; // RETURNING * es magia de Postgres: nos devuelve el dato recién creado
    
    const values = [title, description, user_id];

    const result = await pool.query(query, values);
    
    // Devolvemos la tarea creada (ideal para que el frontend actualice la UI sin recargar)
    res.status(201).json(result.rows[0]); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la tarea' });
  }
});

// 3. ACTUALIZAR UNA TAREA (Marcar como completada)
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params; // Capturamos el ID de la URL
  const { is_completed } = req.body; // Capturamos el nuevo estado del JSON

  try {
    const query = `
      UPDATE tasks 
      SET is_completed = $1 
      WHERE id = $2 
      RETURNING *`;
    
    const values = [is_completed, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la tarea' });
  }
});

// 4. BORRAR UNA TAREA
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    res.json({ message: 'Tarea eliminada correctamente', task: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la tarea' });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});