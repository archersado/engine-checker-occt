import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  parseFileWithOcct(file: Express.Multer.File): string {
    // 假设这里是调用 OCCT 解析逻辑的代码
    // 例如：解析文件并返回结果
    const fileContent = file.buffer.toString(); // 示例：读取文件内容
    return `文件解析成功: ${file.originalname}`;
  }
}
