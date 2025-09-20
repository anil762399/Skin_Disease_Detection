import os
import sqlite3
import numpy as np
from datetime import datetime
from flask import Flask, request, render_template, jsonify, session
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image
import re

app = Flask(__name__)
app.secret_key = 'dermacare_secret_key_2025'  # Change this to a random secret key

UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

MODEL_PATH = 'models/skin_disease_detection_model.h5'
model = load_model(MODEL_PATH)

CLASS_LABELS = ["BA-cellulitis", "BA-impetigo", "FU-athlete-foot", "FU-nail-fungus", 
               "FU-ringworm", "PA-cutaneous-larva-migrans", "VI-chickenpox", "VI-shingles"]

DATABASE_PATH = 'dermacare.db'

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def init_database():
    """Initialize the SQLite database with required tables."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create analysis_history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            prediction TEXT NOT NULL,
            confidence REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create feedback table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            feedback_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Get database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    return conn

def validate_email(email):
    """Validate email format."""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def preprocess_image(image_path):
    """Preprocesses the image for the model."""
    img = Image.open(image_path)
    img = img.resize((224, 224))  
    img = np.array(img) / 255.0 
    img = np.expand_dims(img, axis=0)  
    return img

@app.route('/')
def home():
    """Render homepage."""
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    """Handle user registration."""
    try:
        data = request.json
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validation
        if not name or len(name) < 2:
            return jsonify({'error': 'Name must be at least 2 characters long'}), 400
            
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
            
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if email already exists
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        password_hash = generate_password_hash(password)
        cursor.execute('''
            INSERT INTO users (name, email, password_hash) 
            VALUES (?, ?, ?)
        ''', (name, email, password_hash))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Set session
        session['user_id'] = user_id
        session['user_name'] = name
        session['user_email'] = email
        
        return jsonify({
            'success': True,
            'user': {
                'id': user_id,
                'name': name,
                'email': email,
                'joinDate': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/login', methods=['POST'])
def login():
    """Handle user login."""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()
        
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Set session
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['user_email'] = user['email']
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'joinDate': user['created_at']
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    """Handle user logout."""
    session.clear()
    return jsonify({'success': True})

@app.route('/profile', methods=['GET'])
def get_profile():
    """Get current user profile and analysis history."""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user info
        cursor.execute('SELECT id, name, email, created_at FROM users WHERE id = ?', (session['user_id'],))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Get analysis history
        cursor.execute('''
            SELECT id, filename, prediction, confidence, created_at 
            FROM analysis_history 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        ''', (session['user_id'],))
        
        analyses = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'joinDate': user['created_at']
            },
            'analysisHistory': [
                {
                    'id': analysis['id'],
                    'condition': analysis['prediction'],
                    'confidence': analysis['confidence'] / 100,  # Convert back to decimal
                    'date': analysis['created_at']
                }
                for analysis in analyses
            ]
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get profile: {str(e)}'}), 500

@app.route('/predict', methods=['POST'])
def predict():
    """Handles image upload and prediction."""
    if 'user_id' not in session:
        return jsonify({'error': 'Please login to analyze images'}), 401
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        try:
            filename = secure_filename(file.filename)
            # Add timestamp to filename to avoid conflicts
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
            filename = timestamp + filename
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            img = preprocess_image(file_path)
            predictions = model.predict(img)
            predicted_class = CLASS_LABELS[np.argmax(predictions)]
            confidence = float(np.max(predictions)) * 100  # Convert confidence to percentage

            # Save analysis to database
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO analysis_history (user_id, filename, prediction, confidence) 
                VALUES (?, ?, ?, ?)
            ''', (session['user_id'], filename, predicted_class, confidence))
            conn.commit()
            conn.close()

            # Clean up - optionally delete the uploaded file
            # os.remove(file_path)  # Uncomment if you don't want to keep uploaded files

            return jsonify({
                'filename': filename,
                'prediction': predicted_class,
                'confidence': confidence / 100  # Return as decimal for frontend
            })
            
        except Exception as e:
            return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

@app.route('/feedback', methods=['POST'])
def submit_feedback():
    """Handle feedback submission."""
    if 'user_id' not in session:
        return jsonify({'error': 'Please login to submit feedback'}), 401
    
    try:
        data = request.json
        feedback_text = data.get('feedback', '').strip()
        
        if not feedback_text:
            return jsonify({'error': 'Feedback text required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO feedback (user_id, feedback_text) 
            VALUES (?, ?)
        ''', (session['user_id'], feedback_text))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Feedback submitted successfully'})
        
    except Exception as e:
        return jsonify({'error': f'Failed to submit feedback: {str(e)}'}), 500

@app.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics for the current user."""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get total analyses count
        cursor.execute('SELECT COUNT(*) as total FROM analysis_history WHERE user_id = ?', (session['user_id'],))
        total_analyses = cursor.fetchone()['total']
        
        # Get average confidence
        cursor.execute('SELECT AVG(confidence) as avg_confidence FROM analysis_history WHERE user_id = ?', (session['user_id'],))
        avg_confidence_row = cursor.fetchone()
        avg_confidence = avg_confidence_row['avg_confidence'] if avg_confidence_row['avg_confidence'] else 0
        
        conn.close()
        
        return jsonify({
            'totalAnalyses': total_analyses,
            'avgConfidence': round(avg_confidence, 1) if avg_confidence else 0
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get dashboard stats: {str(e)}'}), 500

# Initialize database on startup
init_database()

if __name__ == '__main__':
    app.run(debug=True)