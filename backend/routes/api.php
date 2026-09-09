<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\ImportExportController;
use App\Http\Controllers\Api\MapController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\FormFieldController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\ScopeDataAccess;
use App\Http\Middleware\EnsureAgentScope;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Public settings (for agent app branding)
Route::get('/settings/public', [SettingsController::class, 'publicSettings']);

// Form fields (public for agent, admin manages them)
Route::get('/form-fields', [FormFieldController::class, 'active']);

Route::middleware(['auth:sanctum', ScopeDataAccess::class])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    Route::get('/lgas', function () {
        return response()->json(\App\Models\Lga::orderBy('name')->get(['id', 'name', 'code']));
    });
    Route::get('/lgas/{id}/wards', function ($id) {
        return response()->json(\App\Models\Ward::where('lga_id', $id)->orderBy('name')->get(['id', 'name', 'code']));
    });
    Route::get('/wards/{id}/polling-units', function ($id) {
        return response()->json(\App\Models\PollingUnit::where('ward_id', $id)->orderBy('name')->get(['id', 'name', 'code']));
    });

    // Agent routes
    Route::middleware([EnsureAgentScope::class, RoleMiddleware::class . ':agent'])->group(function () {
        Route::get('/agent/dashboard', [RegistrationController::class, 'agentDashboard']);
        Route::get('/agent/records', [RegistrationController::class, 'myRecords']);
        Route::get('/agent/check-pvc', [RegistrationController::class, 'checkPvc'])->middleware('throttle:60,1');
        Route::post('/agent/register', [RegistrationController::class, 'storeOffline'])->middleware('throttle:30,1');
        Route::post('/agent/heartbeat', [AuthController::class, 'heartbeat']);
        Route::post('/sync/push', [SyncController::class, 'push'])->middleware('throttle:30,1');
        Route::get('/sync/status', [SyncController::class, 'status']);
    });

    // Shared routes (Admin + Coordinators)
    Route::middleware([RoleMiddleware::class . ':admin|lga_coordinator|ward_coordinator'])->group(function () {
        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
        Route::get('/dashboard/checksum', [DashboardController::class, 'statusChecksum']);
        Route::get('/dashboard/daily', [DashboardController::class, 'dailyStats']);
        Route::get('/dashboard/lgas', [DashboardController::class, 'lgaPerformance']);
        Route::get('/dashboard/wards', [DashboardController::class, 'wardPerformance']);
        Route::get('/dashboard/agents', [DashboardController::class, 'agentPerformance']);
        Route::get('/dashboard/completion', [DashboardController::class, 'completionDistribution']);

        Route::get('/registrations', [RegistrationController::class, 'index']);
        Route::get('/registrations/{id}', [RegistrationController::class, 'show']);
        Route::get('/search', [RegistrationController::class, 'search'])->middleware('throttle:30,1');

        Route::get('/map/polling-units', [MapController::class, 'pollingUnits']);
        Route::get('/map/polling-units/{id}', [MapController::class, 'pollingUnitDetail']);

        // Analytics
        Route::get('/analytics/gender', [AnalyticsController::class, 'genderBreakdown']);
        Route::get('/analytics/age', [AnalyticsController::class, 'ageDistribution']);
        Route::get('/analytics/hourly', [AnalyticsController::class, 'hourlyHeatmap']);
        Route::get('/analytics/trends', [AnalyticsController::class, 'agentTrends']);
        Route::get('/analytics/lga-rankings', [AnalyticsController::class, 'lgaRankings']);
        Route::get('/analytics/kpi', [AnalyticsController::class, 'summaryKpi']);
    });

    // Admin-only routes
    Route::middleware([RoleMiddleware::class . ':admin'])->group(function () {
        Route::apiResource('/users', AdminController::class);
        Route::post('/users/{id}/assign', [AdminController::class, 'assignAgent']);
        Route::post('/users/{id}/reassign', [AdminController::class, 'reassignAgent']);
        Route::post('/users/{id}/assign-scope', [AdminController::class, 'assignScope']);
        Route::post('/users/{id}/deactivate', [AdminController::class, 'deactivate']);

        Route::put('/registrations/{id}', [RegistrationController::class, 'update']);
        Route::delete('/registrations/{id}', [RegistrationController::class, 'softDelete']);

        Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
        Route::get('/sync-conflicts', [SyncController::class, 'conflicts']);
        Route::post('/sync-conflicts/{id}/resolve', [SyncController::class, 'resolveConflict']);

        Route::post('/import/polling-units', [ImportExportController::class, 'importPollingUnits']);
        Route::get('/export/registrations', [ImportExportController::class, 'exportRegistrations']);

        // Settings
        Route::get('/settings', [SettingsController::class, 'index']);
        Route::post('/settings', [SettingsController::class, 'update']);
        Route::post('/settings/logo', [SettingsController::class, 'uploadLogo']);
        Route::post('/settings/reset', [SettingsController::class, 'resetDefaults']);

        // Form Builder
        Route::get('/form-fields/all', [FormFieldController::class, 'index']);
        Route::post('/form-fields', [FormFieldController::class, 'store']);
        Route::put('/form-fields/{id}', [FormFieldController::class, 'update']);
        Route::delete('/form-fields/{id}', [FormFieldController::class, 'destroy']);
        Route::post('/form-fields/reorder', [FormFieldController::class, 'reorder']);
    });
});
