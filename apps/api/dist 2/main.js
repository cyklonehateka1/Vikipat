"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./env");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const fs_1 = require("fs");
const app_module_1 = require("./app.module");
async function bootstrap() {
    if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64 ||
        !process.env.ADMIN_PASSWORD || !process.env.POSTGRES_PASSWORD ||
        !process.env.TRACKING_OTP_SECRET || process.env.TRACKING_OTP_SECRET.length < 32))
        throw new Error('Production requires strong JWT, admin, database, and tracking OTP secrets');
    const uploadDirectory = process.env.UPLOAD_DIRECTORY || 'uploads';
    (0, fs_1.mkdirSync)(uploadDirectory, { recursive: true });
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use((0, cookie_parser_1.default)());
    app.enableCors({
        origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(','),
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useStaticAssets(uploadDirectory, { prefix: '/uploads/' });
    await app.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1');
}
bootstrap();
//# sourceMappingURL=main.js.map