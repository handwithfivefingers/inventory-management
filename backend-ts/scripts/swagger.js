import swaggerAutogen from 'swagger-autogen'

const doc = {
  info: {
    title: 'Express Sequelize API',
    description: 'API Spec được sinh tự động',
    version: '1.0.0'
  },
  host: 'localhost:3000',
  schemes: ['http']
  // Định nghĩa các Schema mẫu dựa trên Model Sequelize nếu muốn (Không bắt buộc)
  // definitions: {
  //   User: {
  //     id: 1,
  //     name: 'John Doe',
  //     email: 'john@example.com'
  //   }
  // }
}

const outputFile = '../swagger-output.json'
const routesInProject = ['../src/index.ts'] // Đường dẫn tới file khởi chạy Express của bạn

// Chạy hàm sinh ra file spec JSON
swaggerAutogen()(outputFile, routesInProject, doc)
