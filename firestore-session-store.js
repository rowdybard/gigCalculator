const { EventEmitter } = require('events');

class FirestoreSessionStore extends EventEmitter {
  constructor(db, options = {}) {
    super();
    this.db = db;
    this.collection = options.collection || 'sessions';
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours default
  }

  async get(sessionId, callback) {
    try {
      const doc = await this.db.collection(this.collection).doc(sessionId).get();
      
      if (!doc.exists) {
        return callback(null, null);
      }

      const data = doc.data();
      const now = Date.now();

      // Check if session has expired
      if (data.expires && data.expires < now) {
        await this.destroy(sessionId);
        return callback(null, null);
      }

      callback(null, data.session);
    } catch (error) {
      callback(error);
    }
  }

  async set(sessionId, session, callback) {
    try {
      const expires = Date.now() + this.ttl;
      
      await this.db.collection(this.collection).doc(sessionId).set({
        session,
        expires,
        updatedAt: new Date()
      });

      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async destroy(sessionId, callback) {
    try {
      await this.db.collection(this.collection).doc(sessionId).delete();
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async touch(sessionId, session, callback) {
    try {
      const expires = Date.now() + this.ttl;
      
      await this.db.collection(this.collection).doc(sessionId).update({
        session,
        expires,
        updatedAt: new Date()
      });

      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  // Clean up expired sessions (optional)
  async cleanup() {
    try {
      const now = Date.now();
      const snapshot = await this.db.collection(this.collection)
        .where('expires', '<', now)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }
}

module.exports = FirestoreSessionStore;
