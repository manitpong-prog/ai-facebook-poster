# AI Facebook Poster - Project History

## Project Overview
AI Facebook Poster เป็นระบบช่วยสร้างโพสต์ Facebook โดยใช้ AI ช่วยสร้างเนื้อหา แต่ผู้ใช้เป็นผู้ตรวจสอบและกดโพสต์เอง

## Development History
- Auto Facebook Poster
- Auto Pilot (Cron)
- Pantip Manual Post
- RSS News

## Pantip
ปัญหาสำคัญคือ Pantip ใช้ class display-post-story ทั้งกับโพสต์หลักและคอมเมนต์

แนวทางที่สำเร็จคือใช้ HTML-first Main Story Extractor โดยดึงจาก

display-post-status-leftside -> display-post-story-wrapper -> display-post-story

ทำให้ดึงข้อความกระทู้หลักได้ถูกต้องและไม่ดึงคอมเมนต์

## Caption Style
- ภาษาคน
- เหมือนเล่าให้เพื่อนฟัง
- ใส่เครดิตและลิงก์ต้นทาง
