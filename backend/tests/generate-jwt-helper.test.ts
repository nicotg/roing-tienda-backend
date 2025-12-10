// The folder test was added to tsconfig.json "exclude" to avoid including test files in the build
import { describe, it, expect, beforeEach, afterAll, jest } from "@jest/globals";
import { generateJWT } from "../src/helpers/generate-jwt-helper";
import jwt from "jsonwebtoken";

describe("generateJWT (simple)", () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
        // Clear any previous environment variable changes
		process.env = { ...OLD_ENV };
	});

	afterAll(() => {
        // Restore original environment variables
		process.env = OLD_ENV;
	});

	it("generate a valid JWT token that contains the userId in the payload", async () => {
		// Arrange
		process.env.JWT_SECRET = "test_secret";
		const userId = "abc-123";

		// Act
		const token = await generateJWT(userId);

		// Assert: a non empty string is returned
		expect(typeof token).toBe("string");
		expect(token.length).toBeGreaterThan(10);

		const decoded = jwt.verify(token, "test_secret") as jwt.JwtPayload;
		expect(decoded.userId).toBe(userId);
	});

});


