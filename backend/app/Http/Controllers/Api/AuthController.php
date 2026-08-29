<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            AuditService::log('AUTH_FAILED', 'auth', null, null, ['username' => $request->username, 'reason' => 'invalid_credentials']);
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if (!$user->is_active) {
            AuditService::log('AUTH_FAILED', 'auth', (string)$user->id, null, ['username' => $request->username, 'reason' => 'account_deactivated']);
            return response()->json(['message' => 'Account is deactivated'], 403);
        }

        // Update last login
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        AuditService::log('AUTH_SUCCESS', 'auth', (string)$user->id);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'full_name' => $user->full_name,
                'role' => $user->role?->name,
                'permissions' => $user->role?->permissions ?? [],
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $user = auth()->user();
        if ($user) {
            $user->currentAccessToken()->delete();
            AuditService::log('AUTH_LOGOUT', 'auth', (string)$user->id);
        }
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        $user = auth()->user();
        $assignment = $user->currentAssignment();
        $pu = $assignment?->pollingUnit;

        return response()->json([
            'id' => $user->id,
            'username' => $user->username,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role?->name,
            'permissions' => $user->role?->permissions ?? [],
            'is_active' => $user->is_active,
            'assignment' => $pu ? [
                'polling_unit_id' => $pu->id,
                'polling_unit_name' => $pu->name,
                'polling_unit_code' => $pu->code,
                'ward_id' => $pu->ward_id,
                'ward_name' => $pu->ward?->name,
                'lga_id' => $pu->ward?->lga_id,
                'lga_name' => $pu->ward?->lga?->name,
            ] : null,
        ]);
    }

    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = auth()->user();

        if (!Hash::check($request->current_password, $user->password_hash)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->update(['password_hash' => Hash::make($request->new_password)]);
        AuditService::log('PASSWORD_CHANGED', 'user', (string)$user->id);

        return response()->json(['message' => 'Password changed successfully']);
    }

    public function heartbeat(Request $request)
{
    $user = auth()->user();
    $user->update(['last_seen_at' => now()]);
    return response()->json(['status' => 'ok', 'server_time' => now()->toIso8601String()]);
}

}
