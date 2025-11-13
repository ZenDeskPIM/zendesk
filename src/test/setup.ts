import '@testing-library/jest-dom';

process.on('uncaughtException', (error) => {
	// Surface hidden errors during Vitest runs
	console.error('[vitest] uncaughtException', error);
});

process.on('unhandledRejection', (reason) => {
	console.error('[vitest] unhandledRejection', reason);
});