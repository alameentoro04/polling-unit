<?php

namespace Database\Seeders;

use App\Models\FormField;
use Illuminate\Database\Seeder;

class FormFieldSeeder extends Seeder
{
    public function run(): void
    {
        $fields = [
            [
                'label' => 'Occupation',
                'key' => 'occupation',
                'type' => 'text',
                'required' => false,
                'sort_order' => 10,
                'placeholder' => 'e.g. Farmer, Teacher, Trader',
                'help_text' => 'Optional occupation of the registrant',
            ],
            [
                'label' => 'Residential Address',
                'key' => 'residential_address',
                'type' => 'textarea',
                'required' => false,
                'sort_order' => 20,
                'placeholder' => 'Enter street address',
                'help_text' => 'Current residential address',
            ],
            [
                'label' => 'Voter Category',
                'key' => 'voter_category',
                'type' => 'select',
                'required' => false,
                'options' => ['New Voter', 'Transfer', 'Replacement'],
                'sort_order' => 30,
                'placeholder' => '',
                'help_text' => 'Category of voter registration',
            ],
        ];

        foreach ($fields as $f) {
            FormField::updateOrCreate(['key' => $f['key']], $f);
        }
    }
}
