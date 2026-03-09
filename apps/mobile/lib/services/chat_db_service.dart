import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import '../core/models/chat_message.model.dart';

/// Set to true to enable verbose chat module logging (DB, provider, UI).
const bool kChatDebug = true;

void _chatLog(String tag, String message, [Object? detail]) {
  if (kChatDebug) {
    if (detail != null) {
      debugPrint('[$tag] $message $detail');
    } else {
      debugPrint('[$tag] $message');
    }
  }
}

/// Local SQLite database for offline-first chat persistence.
///
/// Flow:
///   1. Messages are saved locally with status=pending
///   2. Sync service sends them to backend
///   3. On success, status is updated to sent and syncedAt is set
///   4. On failure, status is set to failed (can be retried)
class ChatDbService {
  static final ChatDbService _instance = ChatDbService._internal();
  factory ChatDbService() => _instance;
  ChatDbService._internal();

  Database? _db;
  bool _initFailed = false;

  Future<Database> get database async {
    if (_initFailed) {
      _chatLog('ChatDB', 'database get: already failed, rethrowing');
      throw StateError('Chat database initialization previously failed');
    }
    if (_db != null) return _db!;
    try {
      _db = await _initDb();
      _chatLog('ChatDB', 'database get: initialized');
      return _db!;
    } catch (e) {
      _initFailed = true;
      debugPrint('[ChatDB] FATAL: Database initialization failed: $e');
      rethrow;
    }
  }

  Future<Database> _initDb() async {
    debugPrint('[ChatDB] Initializing database...');
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'kabariya_chat.db');
    debugPrint('[ChatDB] Database path: $path');

    final db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        debugPrint('[ChatDB] Creating tables...');
        await db.execute('''
          CREATE TABLE chat_messages (
            id TEXT PRIMARY KEY,
            roomId TEXT NOT NULL,
            fromUserId TEXT NOT NULL,
            toUserId TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            createdAt TEXT NOT NULL,
            syncedAt TEXT,
            isMe INTEGER NOT NULL DEFAULT 0
          )
        ''');
        await db.execute(
          'CREATE INDEX idx_chat_room ON chat_messages (roomId, createdAt)',
        );
        await db.execute(
          'CREATE INDEX idx_chat_status ON chat_messages (status)',
        );
        debugPrint('[ChatDB] Tables created successfully');
      },
    );
    debugPrint('[ChatDB] Database initialized successfully');
    return db;
  }

  /// Insert a new message locally
  Future<void> insertMessage(ChatMessageModel msg) async {
    _chatLog('ChatDB', 'insertMessage', 'room=${msg.roomId} id=${msg.id} from=${msg.fromUserId} to=${msg.toUserId} status=${msg.status.name}');
    final db = await database;
    await db.insert(
      'chat_messages',
      msg.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    _chatLog('ChatDB', 'insertMessage done', msg.id);
  }

  /// Insert multiple messages (batch, for initial sync from server)
  Future<void> insertMessages(List<ChatMessageModel> messages) async {
    final db = await database;
    final batch = db.batch();
    for (final msg in messages) {
      batch.insert(
        'chat_messages',
        msg.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  /// Get all messages for a room, ordered by creation time
  Future<List<ChatMessageModel>> getMessages(String roomId, {int limit = 200, int offset = 0}) async {
    _chatLog('ChatDB', 'getMessages', 'roomId=$roomId limit=$limit offset=$offset');
    final db = await database;
    final rows = await db.query(
      'chat_messages',
      where: 'roomId = ?',
      whereArgs: [roomId],
      orderBy: 'createdAt ASC',
      limit: limit,
      offset: offset,
    );
    final list = rows.map((r) => ChatMessageModel.fromMap(r)).toList();
    _chatLog('ChatDB', 'getMessages result', 'count=${list.length}');
    return list;
  }

  /// Get all unsent messages (pending or failed) for retry/sync
  Future<List<ChatMessageModel>> getUnsentMessages() async {
    final db = await database;
    final rows = await db.query(
      'chat_messages',
      where: "status = 'pending' OR status = 'failed'",
      orderBy: 'createdAt ASC',
    );
    return rows.map((r) => ChatMessageModel.fromMap(r)).toList();
  }

  /// Update message status (e.g. pending → sent, pending → failed)
  Future<void> updateMessageStatus(String messageId, MessageStatus status, {DateTime? syncedAt}) async {
    _chatLog('ChatDB', 'updateMessageStatus', 'id=$messageId status=${status.name}');
    final db = await database;
    final values = <String, dynamic>{'status': status.name};
    if (syncedAt != null) values['syncedAt'] = syncedAt.toIso8601String();

    await db.update(
      'chat_messages',
      values,
      where: 'id = ?',
      whereArgs: [messageId],
    );
    _chatLog('ChatDB', 'updateMessageStatus done', messageId);
  }

  /// Check if a message already exists locally
  Future<bool> messageExists(String messageId) async {
    final db = await database;
    final count = Sqflite.firstIntValue(await db.rawQuery(
      'SELECT COUNT(*) FROM chat_messages WHERE id = ?',
      [messageId],
    ));
    return (count ?? 0) > 0;
  }

  /// Get the latest synced message timestamp for a room (for incremental sync)
  Future<DateTime?> getLatestSyncTime(String roomId) async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT MAX(syncedAt) as latest FROM chat_messages WHERE roomId = ? AND syncedAt IS NOT NULL',
      [roomId],
    );
    if (result.isNotEmpty && result.first['latest'] != null) {
      return DateTime.parse(result.first['latest'] as String);
    }
    return null;
  }

  /// Delete all messages for a room (used when clearing conversation)
  Future<void> deleteRoomMessages(String roomId) async {
    final db = await database;
    await db.delete('chat_messages', where: 'roomId = ?', whereArgs: [roomId]);
  }

  /// Get distinct room IDs for the conversation list
  Future<List<String>> getRoomIds() async {
    final db = await database;
    final rows = await db.rawQuery(
      'SELECT DISTINCT roomId FROM chat_messages ORDER BY createdAt DESC',
    );
    return rows.map((r) => r['roomId'] as String).toList();
  }

  /// Get room IDs where this user participated (for per-user inbox).
  /// Only rooms with at least one message from or to [userId] are returned, newest first.
  Future<List<String>> getRoomIdsForUser(String userId) async {
    final db = await database;
    final rows = await db.rawQuery(
      '''SELECT roomId, MAX(createdAt) as lastAt FROM chat_messages
         WHERE fromUserId = ? OR toUserId = ?
         GROUP BY roomId ORDER BY lastAt DESC''',
      [userId, userId],
    );
    return rows.map((r) => r['roomId'] as String).toList();
  }

  /// Get the latest message for a given room (for conversation list preview)
  Future<ChatMessageModel?> getLatestMessage(String roomId) async {
    final db = await database;
    final rows = await db.query(
      'chat_messages',
      where: 'roomId = ?',
      whereArgs: [roomId],
      orderBy: 'createdAt DESC',
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return ChatMessageModel.fromMap(rows.first);
  }
}
