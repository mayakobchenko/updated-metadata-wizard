import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ timestamp, level, message, stack }) => {
    // to check if there is a stack in the error for debugging
    return `${timestamp} [${level}]: ${message}${stack ? `\n${stack}` : ''}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: combine(
        colorize(),
        timestamp(),
        winston.format.errors({ stack: true }), 
        logFormat
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'wizard_mayas_edition.log' })
    ]
});

export default logger;

/*const log = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }), // Include stack trace
        winston.format.json()
    )
});*/