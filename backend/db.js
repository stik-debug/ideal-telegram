const { DatabaseSync } = require('node:sqlite');
const fs = require('fs'), path = require('path');
function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys=ON');
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8'));
  seed(db);
  return db;
}
function seed(db) {
  const content = require('./content');
  const courseInsert = db.prepare('INSERT INTO courses(slug,title,summary,price_kes,published,content_status) VALUES(?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,published=excluded.published,content_status=excluded.content_status');
  const findCourse = db.prepare('SELECT id FROM courses WHERE slug=?');
  const findLesson = db.prepare('SELECT id FROM lessons WHERE course_id=? AND pos=?');
  const insertLesson = db.prepare('INSERT INTO lessons(course_id,pos,title,body,is_free) VALUES(?,?,?,?,?)');
  const updateLesson = db.prepare('UPDATE lessons SET title=?,body=?,is_free=? WHERE id=?');
  const insertQuiz = db.prepare('INSERT INTO quizzes(lesson_id,question,options,answer,explain) VALUES(?,?,?,?,?)');
  const clearQuizzes = db.prepare('DELETE FROM quizzes WHERE lesson_id=?');
  for (const co of content) {
    courseInsert.run(co.slug, co.title, co.summary, co.price, 1, 'complete');
    const id = findCourse.get(co.slug).id;
    co.lessons.forEach((le, i) => {
      const pos = i + 1, old = findLesson.get(id, pos);
      let lid;
      if (old) { lid = old.id; updateLesson.run(le.title, le.body, i === 0 ? 1 : 0, lid); }
      else { lid = Number(insertLesson.run(id, pos, le.title, le.body, i === 0 ? 1 : 0).lastInsertRowid); }
      clearQuizzes.run(lid); (le.quiz || []).forEach(x => insertQuiz.run(lid, x.q, JSON.stringify(x.o), x.a, x.e));
    });
  }
}
module.exports = { open };
