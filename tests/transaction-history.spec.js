
const { test, expect } = require('@playwright/test');
const testData = require('../test-data/transaction-data.json');

const BASE_PATH =
    '/dtv-viu-common-apis/query/transaction-history';

function buildEndpoint(
    transactionId = testData.transactionId,
    service = testData.service
) {
    return `${BASE_PATH}/${transactionId}/${service}`;
}

const EXPECTED = {
    success: 200,
    validationError: [400, 422],
    invalidResource: [400, 404, 422]
};

// Shared helper for invalid subscriber UID scenarios.
// A failure can be an HTTP error or execution code "01".
function validateSubscriberUidFailure({ status, responseBody }) {
    const isHttpError = status >= 400;

    const isBusinessFailure =
        responseBody !== null &&
        typeof responseBody === 'object' &&
        responseBody.code === '01';

    expect(
        isHttpError || isBusinessFailure,
        `Expected failure for invalid subscriberUid. ` +
        `Received HTTP ${status}, response: ${JSON.stringify(responseBody)}`
    ).toBe(true);
}

async function runApiTest(request, scenario) {
    const endpoint = scenario.endpoint ?? buildEndpoint();

    console.log('\n' + '='.repeat(70));
    console.log(`TEST: ${scenario.id} - ${scenario.name}`);
    console.log('='.repeat(70));
    console.log('Method: POST');
    console.log('Endpoint:', endpoint);
    console.log('Request Body:');
    console.log(JSON.stringify(scenario.body, null, 2));

    let response;

    try {
        response = await request.post(endpoint, {
            data: scenario.body,
            timeout: 30000
        });
    } catch (error) {
        console.log('\nTEST RESULT: FAIL - Request could not be completed');
        console.log('Error:', error.message);
        throw error;
    }

    const status = response.status();
    const statusText = response.statusText();
    const responseText = await response.text();

    let responseBody;

    try {
        responseBody = JSON.parse(responseText);
    } catch {
        responseBody = responseText || '(Empty response body)';
    }

    console.log('\n--------------- API RESPONSE ----------------');
    console.log('HTTP Status:', status);
    console.log('Status Text:', statusText);
    console.log('Response Body:');
    console.log(
        typeof responseBody === 'string'
            ? responseBody
            : JSON.stringify(responseBody, null, 2)
    );
    console.log('---------------------------------------------');

    try {
        scenario.validate({
            status,
            statusText,
            responseBody,
            responseText
        });

        console.log(`TEST RESULT: PASS - ${scenario.id}`);
    } catch (error) {
        console.log(`TEST RESULT: FAIL - ${scenario.id}`);
        console.log('Assertion:', error.message);
        throw error;
    } finally {
        console.log('='.repeat(70) + '\n');
    }
}

const validBody = {
    subscriberUid: testData.subscriberUid,
    deviceType: testData.deviceType
};

const scenarios = [

    // TC01: Valid request with deviceType
    {
        id: 'TC01',
        name: 'Valid request with deviceType',
        body: validBody,
        validate: ({ status, responseBody, responseText }) => {
            expect(status).toBe(EXPECTED.success);
            expect(responseText.trim()).not.toBe('');

            expect(responseBody).toHaveProperty('code', '00');
            expect(responseBody).toHaveProperty('description');
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.transactions).toBeInstanceOf(Array);
        }
    },

    // TC02: Valid request without optional deviceType
    {
        id: 'TC02',
        name: 'Valid request without optional deviceType',
        body: {
            subscriberUid: testData.subscriberUid
        },
        validate: ({ status, responseBody, responseText }) => {
            expect(status).toBe(EXPECTED.success);
            expect(responseText.trim()).not.toBe('');

            expect(responseBody).toHaveProperty('code', '00');
            expect(responseBody).toHaveProperty('description');
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.transactions).toBeInstanceOf(Array);
        }
    },

    // TC03: Missing mandatory subscriberUid
    {
        id: 'TC03',
        name: 'Missing mandatory subscriberUid',
        body: {
            deviceType: testData.deviceType
        },
        validate: ({ status, responseBody }) => {
            const isHttpError =
                EXPECTED.validationError.includes(status);

            const isBusinessFailure =
                status === 200 &&
                responseBody &&
                responseBody.code === '01';

            expect(isHttpError || isBusinessFailure).toBe(true);
        }
    },

    // TC04: Empty request body
    {
        id: 'TC04',
        name: 'Empty request body',
        body: {},
        validate: ({ status, responseBody }) => {
            const isHttpError =
                EXPECTED.validationError.includes(status);

            const isBusinessFailure =
                status === 200 &&
                responseBody &&
                responseBody.code === '01';

            expect(isHttpError || isBusinessFailure).toBe(true);
        }
    },

    // TC05: Empty mandatory subscriberUid
    {
        id: 'TC05',
        name: 'Empty subscriberUid',
        body: {
            subscriberUid: '',
            deviceType: testData.deviceType
        },
        validate: ({ status, responseBody }) => {
            const isHttpError =
                EXPECTED.validationError.includes(status);

            const isBusinessFailure =
                status === 200 &&
                responseBody &&
                responseBody.code === '01';

            expect(isHttpError || isBusinessFailure).toBe(true);
        }
    },

    // TC06: Empty optional deviceType
    {
        id: 'TC06',
        name: 'Empty optional deviceType',
        body: {
            subscriberUid: testData.subscriberUid,
            deviceType: ''
        },
        validate: ({ status, responseBody }) => {
            expect(status).toBe(EXPECTED.success);
            expect(responseBody).toHaveProperty('code', '00');
        }
    },

    // TC07: Invalid subscriber UID format
    {
        id: 'TC07',
        name: 'Invalid subscriberUid format',
        body: {
            subscriberUid: 'INVALID_UID',
            deviceType: testData.deviceType
        },
        validate: validateSubscriberUidFailure
    },

    // TC08: Non-existing subscriber UID
    {
        id: 'TC08',
        name: 'Non-existing subscriberUid',
        body: {
            subscriberUid: '999999999',
            deviceType: testData.deviceType
        },
        validate: validateSubscriberUidFailure
    },

    // TC09: Alphabetic subscriber UID
    {
        id: 'TC09',
        name: 'Alphabetic subscriberUid',
        body: {
            subscriberUid: 'ABCDEF',
            deviceType: testData.deviceType
        },
        validate: validateSubscriberUidFailure
    },

    // TC10: Subscriber UID containing special characters
    {
        id: 'TC10',
        name: 'Special characters in subscriberUid',
        body: {
            subscriberUid: '@#$%!',
            deviceType: testData.deviceType
        },
        validate: validateSubscriberUidFailure
    },

    // TC11: Subscriber UID with leading/trailing spaces
    {
        id: 'TC11',
        name: 'SubscriberUid with leading and trailing spaces',
        body: {
            subscriberUid: ' 763722945 ',
            deviceType: testData.deviceType
        },
        validate: validateSubscriberUidFailure
    },

    // TC12: Short subscriber UID
    {
        id: 'TC12',
        name: 'Short subscriberUid',
        body: {
            subscriberUid: '123',
            deviceType: testData.deviceType
        },
        validate: validateSubscriberUidFailure
    },

    // TC13: Invalid transaction ID
    {
        id: 'TC13',
        name: 'Invalid transaction ID',
        endpoint: buildEndpoint(
            'INVALID_TXN_ID',
            testData.service
        ),
        body: validBody,
        validate: ({ status, responseBody }) => {
            const isHttpError =
                EXPECTED.invalidResource.includes(status);

            const isBusinessFailure =
                status === 200 &&
                responseBody &&
                responseBody.code === '01';

            expect(isHttpError || isBusinessFailure).toBe(true);
        }
    },

    // TC14: Invalid service
    {
        id: 'TC14',
        name: 'Invalid service',
        endpoint: buildEndpoint(
            testData.transactionId,
            'INVALID_SERVICE'
        ),
        body: validBody,
        validate: ({ status, responseBody }) => {
            const isHttpError =
                EXPECTED.invalidResource.includes(status);

            const isBusinessFailure =
                status === 200 &&
                responseBody &&
                responseBody.code === '01';

            expect(isHttpError || isBusinessFailure).toBe(true);
        }
    },

    // TC15: Invalid deviceType value
    {
        id: 'TC15',
        name: 'Invalid deviceType value',
        body: {
            subscriberUid: testData.subscriberUid,
            deviceType: 'INVALID_DEVICE'
        },
        validate: ({ status, responseBody }) => {
            const isHttpError =
                EXPECTED.validationError.includes(status);

            const isBusinessFailure =
                status === 200 &&
                responseBody &&
                responseBody.code === '01';

            expect(isHttpError || isBusinessFailure).toBe(true);
        }
    },

    // TC16: Null mandatory subscriberUid and optional deviceType
    {
        id: 'TC16',
        name: 'Null subscriberUid and deviceType',
        body: {
            subscriberUid: null,
            deviceType: null
        },
        validate: ({ status, responseBody }) => {
            const isHttpError =
                EXPECTED.validationError.includes(status);

            const isBusinessFailure =
                status === 200 &&
                responseBody &&
                responseBody.code === '01';

            expect(isHttpError || isBusinessFailure).toBe(true);
        }
    },

    // TC17: Incorrect request data types
    {
        id: 'TC17',
        name: 'Incorrect request data types',
        body: {
            subscriberUid: 12345,
            deviceType: true
        },
        validate: ({ status, responseBody }) => {
            const isHttpError =
                EXPECTED.validationError.includes(status);

            const isBusinessFailure =
                status === 200 &&
                responseBody &&
                responseBody.code === '01';

            expect(isHttpError || isBusinessFailure).toBe(true);
        }
    },

    // TC18: Invalid endpoint
    {
        id: 'TC18',
        name: 'Invalid endpoint',
        endpoint:
            `${BASE_PATH}/${testData.transactionId}/${testData.service}/invalid`,
        body: validBody,
        validate: ({ status }) => {
            expect([400, 404, 405]).toContain(status);
        }
    }
];

test.describe('Transaction History API - Test Scenarios', () => {
    for (const scenario of scenarios) {
        test(`${scenario.id} - ${scenario.name}`, async ({ request }) => {
            await runApiTest(request, scenario);
        });
    }
});
