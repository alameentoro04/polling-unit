<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormField;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FormFieldController extends Controller
{
    public function index()
    {
        return response()->json(FormField::orderBy('sort_order')->get());
    }

    public function active()
    {
        return response()->json(FormField::active()->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'label' => 'required|string|max:100',
            'key' => 'required|string|max:50|unique:form_fields',
            'type' => 'required|string|in:text,number,email,tel,date,select,textarea,file',
            'required' => 'boolean',
            'options' => 'nullable|array',
            'sort_order' => 'integer|min:0',
            'active' => 'boolean',
            'placeholder' => 'nullable|string|max:255',
            'help_text' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $field = FormField::create($request->all());
        return response()->json($field, 201);
    }

    public function update(Request $request, $id)
    {
        $field = FormField::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'label' => 'sometimes|string|max:100',
            'type' => 'sometimes|string|in:text,number,email,tel,date,select,textarea,file',
            'required' => 'boolean',
            'options' => 'nullable|array',
            'sort_order' => 'integer|min:0',
            'active' => 'boolean',
            'placeholder' => 'nullable|string|max:255',
            'help_text' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $field->update($request->all());
        return response()->json($field);
    }

    public function destroy($id)
    {
        $field = FormField::findOrFail($id);
        $field->delete();
        return response()->json(['message' => 'Field deleted']);
    }

    public function reorder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'orders' => 'required|array',
            'orders.*.id' => 'required|integer',
            'orders.*.sort_order' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->input('orders') as $item) {
            FormField::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'Order updated']);
    }
}
